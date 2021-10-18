import { PolymanConfig, DefaultIndexerPath } from "./getPolymanConfig";
import express from 'express';
import cors from 'cors';
import timeout from "connect-timeout";
import { asyncSleep, generateGodwokenConfig, getDeployScriptsPaths, loadJsonFile, readScriptCodeHashFromFile, saveJsonFile } from './util';
import path from "path";
import { Api } from "./api";
import { execSync } from "child_process";
import { ScriptDeploymentTransactionInfo } from "./types";

let cfgIdx = 2;
switch (process.env.MODE) {
  case "docker-compose":
    cfgIdx = 1;
    break;
  case "testnet":
    cfgIdx = 0;
    break;
  default:
    cfgIdx = 2;
}

const ckb_rpc_url = PolymanConfig.components.ckb.rpc[cfgIdx];
const godwoken_rpc_url = PolymanConfig.components.godwoken.rpc[cfgIdx];
const miner_private_key = PolymanConfig.miner_private_key;
const miner_ckb_devnet_addr = PolymanConfig.miner_ckb_devnet_addr;
const user_ckb_devnet_addr = PolymanConfig.user_ckb_devnet_addr;
const user_account_init_amount = BigInt(PolymanConfig.user_account_init_amount);
const user_private_key = PolymanConfig.user_private_key;
const STORE_PATH_ROOT = path.resolve(DefaultIndexerPath, "./call-polyman");
const indexer_db_path = path.resolve(STORE_PATH_ROOT, "./indexer-db");
const scripts_deployed_history_path = path.resolve(STORE_PATH_ROOT, "./scripts_deploy_history.json");

const api = new Api(ckb_rpc_url, godwoken_rpc_url, indexer_db_path);
api.syncLayer1();

export const app = express();
const corsOptions = {
    origin: ["*"],
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
}
app.use(cors(corsOptions));
app.use(timeout('600s')); // keep alive for a long time
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({limit: '1mb'}));

app.get('/ping', async function (req, res) {
    res.send({status:'ok', data:'pong'});
});

app.get('/prepare_money', async function (req, res) {
    console.log("start prepare money..");
    var retry = 0;
    const run_prepare_money = async (maxRetryLimit: number, intervals=5000) => {
        try {
          const isMoneyReady = await api.checkCkbBalance(user_ckb_devnet_addr, user_account_init_amount);
          if(isMoneyReady){
            console.log(`money already prepared.`);
            console.log(`finished~`);
            res.send({status: 'ok', data: 'money already prepared. finished.'});
          }else{
            retry++;
            await api.giveUserLayer1AccountSomeMoney(miner_ckb_devnet_addr, miner_private_key, user_ckb_devnet_addr, user_account_init_amount);
            console.log(`prepared money.`);
            console.log(`finished~`);
            res.send({status: 'ok', data: 'prepared money. finished~'});
          }
        } catch (e) {
          console.error(e);
          if(retry < maxRetryLimit){
            await asyncSleep(intervals);
            console.log(`retry...${retry}th times`);
            run_prepare_money(maxRetryLimit);
          }else{
            console.error(`failed to prepare money.`);
            res.send({status: 'failed', data: 'failed to prepare money.'});
          }
        }
    };

    // retry 20 times max.
    await run_prepare_money(20);
});

app.get('/prepare_sudt_scripts', async function (req, res) {
  console.log("start prepare sudt_scripts..");

  var retry = 0;
  const run_prepare_sudt_scripts = async (maxRetryLimit: number, intervals=5000) => {
    try {
      const isSudtScriptAlreadyExits = await api.checkIfL1SudtScriptExist(ckb_rpc_url);
      if(isSudtScriptAlreadyExits){
        console.log(`sudt script already prepared.`);
        console.log(`finished~`);
        res.send({status: 'ok', data: 'sudt script already prepared. finished~'});
      }else{
        retry++;
        await api.deployLayer1Sudt(user_private_key);
        console.log(`prepared sudt scripts.`);
        console.log(`finished~`);
        res.send({status: 'ok', data: 'prepared sudt scripts. finished~'});
      }
    } catch (e) {
      console.error(e);
      if(retry < maxRetryLimit){
        await asyncSleep(intervals);
        console.log(`retry...${retry}th times`);
        run_prepare_sudt_scripts(maxRetryLimit);
      }else{
        console.error(`failed to prepare sudt script for lumos.`);
        res.send({status: 'failed', data: 'failed to prepare sudt script for lumos.'});
      }
    }
  };

  // retry 20 times max.
  await run_prepare_sudt_scripts(20);
});

app.get('/gen_config', async function (req, res) {
  let stdout1 = await execSync('cp /code/workspace/deploy/scripts-deploy-result.json ./configs/scripts-deploy-result.json');
  let stdout2 = await execSync('cp /code/workspace/config.toml ./configs/config.toml');

  console.log(stdout1, stdout2);

  console.log("start gen config..");
  try {
    await generateGodwokenConfig('../configs/config.toml', '../configs/godwoken-config.json');
    res.send({status: 'ok', data: 'generated new godwoken config for polyman.'});
  } catch (error) {
    res.send({status: 'failed', error: error});
  }
});

app.get('/get_lumos_config', async function(req, res){
  try {;
    const config = await api.getLumosConfigFile();
    res.send({status: 'ok', data: config }); 
  } catch (error) {
    res.send({status: 'failed', error: error}); 
  }
});

app.get('/get_lumos_script_info', async function(req, res){
  try {
    const script_name: string = req.query.script_name + '';
    const key = req.query.key + '';
    const config = await api.getLumosConfigFile();
    res.send({status: 'ok', data: config.SCRIPTS[script_name][key] }); 
  } catch (error) {
    res.send({status: 'failed', error: error}); 
  }
});

app.get('/spilt_miner_cells', async function(req, res){
  try {
    const total_capacity: bigint = BigInt(req.query.total_capacity + '');
    const total_pieces = parseInt(req.query.total_pieces + '');
    const tx_hash = await api.sendSplitCells(total_capacity, total_pieces, miner_private_key);
    res.send({status:'ok', data: tx_hash});
  } catch (error) {
    res.send({status: 'failed', error: error}); 
  }
});

app.get('/deploy_godwoken_scripts', async function(req, res){
  const totalProgressDuration = 63;
  try {
    const scripts_deploy_file_path: string = req.query.scripts_file_path + '';
    const scripts_deploy_result_file_path: string = req.query.deploy_result_file_path + '';
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

    let retry = 0;
    const run_deploy_script = async (script_name: string, script_path: string, result_collector: Map<string, ScriptDeploymentTransactionInfo>, maxRetryLimit: number = 5, intervals=5000) => {
      try {
        retry++;
        if(history && script_name in history && await api.checkIfScriptCellExist((history[script_name] as ScriptDeploymentTransactionInfo).outpoint, ckb_rpc_url)){
          console.log(`script "${script_name}" already deployed and is saved in history, skip.`);
          already_deployed_scripts.push(script_name);
          total_scripts_number--;
          return result_collector.set(script_name, history[script_name] as ScriptDeploymentTransactionInfo); 
        }
        
        console.log(`ready to deploy script: ${script_name}, file_path: ${script_path}`);
        const contract_code_hash = await readScriptCodeHashFromFile(script_path);
        const script_deployment = await api.sendScriptDeployTransaction(contract_code_hash, miner_private_key); 
        result_collector.set(script_name, script_deployment);
      } catch (e) {
        console.error(e);
        if(retry < maxRetryLimit){
          await asyncSleep(intervals);
          console.log(`retry...${retry}th times`);
          await run_deploy_script(script_name, script_path, result_collector, maxRetryLimit);
        }else{
          console.error(`failed to deploy godwoken script ${script_name}.`);
        }
      }
    };

    let script_deployment_tx_info: Map<string, ScriptDeploymentTransactionInfo> = new Map(); // script_name -> tx_hash
    for(const script_name of script_names){
      retry = 0;
      const script_path_root = '/code/workspace/';
      const script_path = script_path_root + scripts_paths[script_name];
      // each script will try re-deploy when failed, retry will be 5 times max.
      await run_deploy_script(script_name, script_path, script_deployment_tx_info);
    }

    let scripts_history = {};
    for(const [script_name, deployment] of script_deployment_tx_info){
      if(!already_deployed_scripts.includes(script_name)){
        await api.waitForCkbTx(deployment.outpoint.tx_hash);
        deploy_counter++;
        console.log(`successful deployed script: ${script_name}, total_progress: ${deploy_counter}/${total_scripts_number}, percentage: ${ 6 + Math.ceil(deploy_counter * totalProgressDuration / total_scripts_number) }, `);
      }

      const history: ScriptDeploymentTransactionInfo = {
        outpoint: deployment.outpoint,
        script_hash: deployment.script_hash
      };
      scripts_history[script_name] = history;
    }
    // save history of successful deployment scripts.
    console.log("finish deploying godwoken scripts now.");
    saveJsonFile(scripts_history, scripts_deployed_history_path);
    console.timeEnd(statist_time_label);

    if(deploy_counter === 0 && total_scripts_number === 0){
      const result = {status: 'ok', data: `all godwoken scripts are already deployed. skip~`};
      console.log(result);
      return res.send(result); 
    }

    if(deploy_counter === total_scripts_number){
      // save the scripts_deploy_result file
      const deploy_result = Object.keys(scripts_history).reduce(function(result, key) {
        result[key] = {
          script_type_hash: scripts_history[key].script_hash,
          cell_dep: {
              "out_point": scripts_history[key].outpoint,
              "dep_type": "code"
            }
        }
        return result;
      }, {});
      const isDeployResultFileGenerated = await saveJsonFile(deploy_result, scripts_deploy_result_file_path);
      const result = {status: 'ok', data: `${total_scripts_number} scripts deployed. generate deploy Result File: ${isDeployResultFileGenerated}. finished~`};
      console.log(result);
      return res.send(result);
    }

    const result = {status:'failed', data: `only able to deployed ${deploy_counter} scripts, required total: ${total_scripts_number}. try again to deploy the rest.`};
    console.log(result);
    res.send(result);
  } catch (error) {
    res.send({status: 'failed', error: error.message});
  }
});

app.get('/deploy_one_script', async function(req, res){
  try {
    const script_name: string = req.query.script_name + '';
    const script_path = req.query.script_path + '';

    var retry = 0;
    const run_deploy_script = async (maxRetryLimit: number, intervals=5000) => {
      try {
        // todo: save/load history and check if scripts exist on-chain.
        retry++;
        const contract_code_hash = await readScriptCodeHashFromFile(script_path);
        const { outpoint, script_hash } = await api.deployLayer1ContractWithTypeId(contract_code_hash, user_private_key);
        console.log(`deploy script ${script_name}, outpoint: ${JSON.stringify(outpoint)}, script_hash: ${script_hash}`);
        console.log(`finished~`);
        res.send({status: 'ok', data: `deploy script ${script_name}, outpoint: ${JSON.stringify(outpoint)}. finished~`});
      } catch (e) {
        console.error(e);
        if(retry < maxRetryLimit){
          await asyncSleep(intervals);
          console.log(`retry...${retry}th times`);
          run_deploy_script(maxRetryLimit);
        }else{
          console.error(`failed to deploy godwoken script ${script_name}.`);
          res.send({status: 'failed', data: `failed to deploy godwoken script ${script_name}.`});
        }
      }
    };
   
    // retry 20 times max.
    await run_deploy_script(20);
  } catch (error) {
    res.send({status: 'failed', error: error}); 
  }
});

export function start () {
   app.listen(PolymanConfig.prepare_service_port, () => {
       console.log(`preparetion server started at http://localhost:${PolymanConfig.prepare_service_port}`);
   });
}
