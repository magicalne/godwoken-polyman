import { polymanConfig, urls, indexerDbPath } from "../base/config";
import { Api } from "../api";
import path from "path";
import {
  generateGodwokenConfig,
  getDeployScriptsPaths,
  loadJsonFile,
  readScriptCodeHashFromFile,
  retry_execution,
  saveJsonFile,
} from "../util";
import { ScriptDeploymentTransactionInfo } from "../base/types/gw";
import { execSync } from "child_process";
import { Service } from "./service";

const STORE_PATH_ROOT = path.resolve(indexerDbPath, "./call-polyman");
const scripts_deployed_history_path = path.resolve(
  STORE_PATH_ROOT,
  "./scripts_deploy_history.json"
);

const service_name = "CallPolyman(setup)";

export class SetupService extends Service {
  public req;
  public res;
  public api: Api;
  public name: string;

  constructor(api: Api, name: string = service_name, req?, res?) {
    super(api, name, req, res);
  }

  async prepare_money() {
    const api = this.api;

    const run_prepare_money = async () => {
      const isMoneyReady = await api.checkCkbBalance(
        polymanConfig.addresses.user_ckb_devnet_addr,
        BigInt(polymanConfig.default_quantity.user_account_init_amount)
      );
      if (isMoneyReady) {
        console.log(`money already prepared.`);
        console.log(`finished~`);
        return "money already prepared. finished.";
      }

      await api.giveUserLayer1AccountSomeMoney(
        polymanConfig.addresses.miner_ckb_devnet_addr,
        polymanConfig.addresses.miner_private_key,
        polymanConfig.addresses.user_ckb_devnet_addr,
        BigInt(polymanConfig.default_quantity.user_account_init_amount)
      );
      return "prepared money. finished~";
    };

    console.log("start prepare money..");
    await retry_execution(run_prepare_money, []);
  }

  async prepare_sudt_scripts() {
    const api = this.api;

    const run_prepare_sudt_scripts = async () => {
      const isSudtScriptAlreadyExits = await api.checkIfL1SudtScriptExist(
        urls.ckb_rpc
      );
      if (isSudtScriptAlreadyExits) {
        console.log(`sudt script already prepared.`);
        console.log(`finished~`);
        return "sudt script already prepared. finished~";
      }

      await api.deployLayer1Sudt(polymanConfig.addresses.user_private_key);
      console.log(`prepared sudt scripts.`);
      console.log(`finished~`);
      return "prepared sudt scripts. finished~";
    };

    console.log("start prepare sudt_scripts..");
    await retry_execution(run_prepare_sudt_scripts, []);
  }

  async gen_config() {
    let stdout1 = await execSync(
      "cp /code/workspace/deploy/scripts-deploy-result.json ./configs/scripts-deploy-result.json"
    );
    let stdout2 = await execSync(
      "cp /code/workspace/config.toml ./configs/config.toml"
    );

    console.log(stdout1, stdout2);

    console.log("start gen config..");
    await generateGodwokenConfig(
      "../configs/config.toml",
      "../configs/godwoken-config.json"
    );
    return "generated new godwoken config for polyman.";
  }

  async get_lumos_config() {
    return await this.api.getLumosConfigFile();
  }

  async get_lumos_script_info() {
    const req = this.req;
    const api = this.api;

    const script_name: string = req.query.script_name + "";
    const key = req.query.key + "";
    const config = await api.getLumosConfigFile();
    return config.SCRIPTS[script_name][key];
  }

  async spilt_miner_cells() {
    const req = this.req;
    const api = this.api;

    const total_capacity: bigint = BigInt(req.query.total_capacity + "");
    const total_pieces = parseInt(req.query.total_pieces + "");
    const tx_hash = await api.sendSplitCells(
      total_capacity,
      total_pieces,
      polymanConfig.addresses.miner_private_key
    );
    return tx_hash;
  }

  async deploy_godwoken_scripts() {
    const req = this.req;
    const api = this.api;

    const totalProgressOffset = 6;
    const totalProgressDuration = 63;

    const scripts_deploy_file_path: string = req.query.scripts_file_path + "";
    const scripts_deploy_result_file_path: string =
      req.query.deploy_result_file_path + "";
    let scripts_paths = await getDeployScriptsPaths(scripts_deploy_file_path);

    let script_names = Object.keys(scripts_paths);
    let total_scripts_number = script_names.length;

    let deploy_counter = 0;
    console.log("start deploying godwoken scripts now.");
    const statist_time_label = `total-deploy-time-for-godwoken-scripts`;
    console.time(statist_time_label);

    // load deployment history file
    const history = await loadJsonFile(scripts_deployed_history_path);
    let already_deployed_scripts: string[] = [];

    const run_deploy_script = async (
      script_name: string,
      script_path: string,
      result_collector: Map<string, ScriptDeploymentTransactionInfo>
    ) => {
      if (
        history &&
        script_name in history &&
        (await api.checkIfScriptCellExist(
          (history[script_name] as ScriptDeploymentTransactionInfo).outpoint,
          urls.ckb_rpc
        ))
      ) {
        console.log(
          `script "${script_name}" already deployed and is saved in history, skip.`
        );
        already_deployed_scripts.push(script_name);
        total_scripts_number--;
        return result_collector.set(
          script_name,
          history[script_name] as ScriptDeploymentTransactionInfo
        );
      }
      console.log(
        `ready to deploy script: ${script_name}, file_path: ${script_path}`
      );
      const contract_code_hash = await readScriptCodeHashFromFile(script_path);
      const script_deployment = await api.sendScriptDeployTransaction(
        contract_code_hash,
        polymanConfig.addresses.miner_private_key
      );
      result_collector.set(script_name, script_deployment);
    };

    let script_deployment_tx_info: Map<
      string,
      ScriptDeploymentTransactionInfo
    > = new Map(); // script_name -> tx_hash
    for (const script_name of script_names) {
      const script_path_root = "/code/workspace/";
      const script_path = script_path_root + scripts_paths[script_name];
      // each script will try re-deploy when failed, retry will be 5 times max.
      const retry_limit = 5;
      await retry_execution(
        run_deploy_script,
        [script_name, script_path, script_deployment_tx_info],
        retry_limit
      );
    }

    let scripts_history = {};
    for (const [script_name, deployment] of script_deployment_tx_info) {
      if (!already_deployed_scripts.includes(script_name)) {
        await api.waitForCkbTx(deployment.outpoint.tx_hash);
        deploy_counter++;
        console.log(
          `successful deployed script: ${script_name}, total_progress: ${deploy_counter}/${total_scripts_number}, percentage: ${
            totalProgressOffset +
            Math.ceil(
              (deploy_counter * totalProgressDuration) / total_scripts_number
            )
          }, `
        );
      }

      const history: ScriptDeploymentTransactionInfo = {
        outpoint: deployment.outpoint,
        script_hash: deployment.script_hash,
      };
      scripts_history[script_name] = history;
    }
    // save history of successful deployment scripts.
    console.log("finish deploying godwoken scripts now.");
    saveJsonFile(scripts_history, scripts_deployed_history_path);
    console.timeEnd(statist_time_label);

    if (deploy_counter === 0 && total_scripts_number === 0) {
      const result = `all godwoken scripts are already deployed. skip~`;
      console.log(result);
      return result;
    }

    if (deploy_counter === total_scripts_number) {
      // save the scripts_deploy_result file
      const deploy_result = Object.keys(scripts_history).reduce(function (
        result,
        key
      ) {
        result[key] = {
          script_type_hash: scripts_history[key].script_hash,
          cell_dep: {
            out_point: scripts_history[key].outpoint,
            dep_type: "code",
          },
        };
        return result;
      },
      {});
      const isDeployResultFileGenerated = await saveJsonFile(
        deploy_result,
        scripts_deploy_result_file_path
      );
      const result = `${total_scripts_number} scripts deployed. generate deploy Result File: ${isDeployResultFileGenerated}. finished~`;
      console.log(result);
      return result;
    }

    throw new Error(
      `only able to deployed ${deploy_counter} scripts, required total: ${total_scripts_number}. try again to deploy the rest.`
    );
  }

  async deploy_one_script() {
    const req = this.req;
    const api = this.api;

    const script_name: string = req.query.script_name + "";
    const script_path = req.query.script_path + "";

    const run_deploy_script = async () => {
      const contract_code_hash = await readScriptCodeHashFromFile(script_path);
      const { outpoint, script_hash } =
        await api.deployLayer1ContractWithTypeId(
          contract_code_hash,
          polymanConfig.addresses.user_private_key
        );
      const result = `deploy script ${script_name}, outpoint: ${JSON.stringify(
        outpoint
      )}, script_hash: ${script_hash}, finished~`;
      console.log(result);
      return result;
    };

    await retry_execution(run_deploy_script, []);
  }
}
