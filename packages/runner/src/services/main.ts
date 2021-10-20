import { getRollupTypeHash } from "../../js/transactions/deposit";
import { deploymentConfig } from "../../js/utils/deployment_config";
import { PolymanConfig, DefaultIndexerPath } from "../getPolymanConfig";
import { Api } from "../api";
import path from "path";
import { loadJsonFile } from "../util";
import fs from "fs";
import { Service } from "./service";

const sudt_id_str = PolymanConfig.default_sudt_id_str;
const godwoken_config_file_path = path.resolve(
  __dirname,
  "../configs/godwoken-config.json"
);
const scripts_deploy_result_file_path = path.resolve(
  __dirname,
  "../configs/scripts-deploy-result.json"
);

const deposit_cell_minimal_capacity = "40000000000";
const default_deposit_amount = PolymanConfig.default_amount;
const default_sudt_issue_amount = PolymanConfig.default_issue_sudt_amount;
const default_sudt_capacity = PolymanConfig.default_deposit_sudt_capacity;
const default_issue_sudt_capacity = PolymanConfig.default_issue_sudt_capacity;
const user_private_key = PolymanConfig.user_private_key;
const user_ckb_address = PolymanConfig.user_ckb_devnet_addr;
const miner_private_key = PolymanConfig.miner_private_key;
const miner_ckb_address = PolymanConfig.miner_ckb_devnet_addr;
const change_amount = "10000000000"; // 100 ckb change for pay fee.
const rollup_type_hash = getRollupTypeHash();

const service_name = "polyjuice";

export class main extends Service {

  constructor(api: Api, name: string=service_name, req?, res?) {
    super(api, service_name, req, res);
  }

  get_server_configs() {
    return PolymanConfig;
  }

  get_rollup_type_hash() {
    return rollup_type_hash;
  }

  get_eth_account_lock() {
    return deploymentConfig.eth_account_lock;
  }

  async get_creator_id() {
    return await this.api.findCreatorAccountId(sudt_id_str);
  }

  async get_godwoken_config() {
    return await loadJsonFile(godwoken_config_file_path);
  }

  async get_godwoken_script_deploy_result_file() {
    return await loadJsonFile(scripts_deploy_result_file_path);
  }

  async deposit() {
    const req = this.req;
    const api = this.api;

    const eth_address = req.query.eth_address + "";
    let amount =
      req.query.amount &&
      BigInt(req.query.amount + "").valueOf() >
        BigInt(deposit_cell_minimal_capacity)
        ? req.query.amount + ""
        : default_deposit_amount;

    const account_id = await api.deposit(user_private_key, eth_address, amount);
    return {
      eth_address: eth_address,
      account_id: account_id,
      deposit_amount: amount,
    };
  }

  async deposit_sudt() {
    const req = this.req;
    const api = this.api;

    const eth_address = req.query.eth_address + "";
    // FIXME: remove this with sudt transfer fixed.
    await api.giveUserLayer1AccountSomeMoney(
      miner_ckb_address,
      miner_private_key,
      user_ckb_address,
      BigInt(change_amount)
    );
    const { account_id, l2_sudt_script_hash } = await api.deposit_sudt(
      user_private_key,
      eth_address,
      default_deposit_amount,
      default_sudt_capacity
    );
    return { account_id, l2_sudt_script_hash };
  }

  async issue_token() {
    const req = this.req;
    const api = this.api;

    const sudt_token = await api.issueToken(
      default_sudt_issue_amount,
      user_private_key,
      BigInt(default_issue_sudt_capacity)
    );
    return { sudt_token: sudt_token };
  }

  async prepare_change_money() {
    const req = this.req;
    const api = this.api;

    await api.giveUserLayer1AccountSomeMoney(
      miner_ckb_address,
      miner_private_key,
      user_ckb_address,
      BigInt(change_amount)
    );
    return { amount: change_amount };
  }

  async create_creator_account() {
    const req = this.req;
    const api = this.api;

    const from_id = req.query.from_id + "";
    return await api.generateCreateCreatorAccountTx(
      from_id,
      sudt_id_str,
      rollup_type_hash
    );
  }

  async deploy_contract() {
    const req = this.req;
    const api = this.api;

    const creator_account_id = await api.findCreatorAccountId(sudt_id_str);
    if (!creator_account_id) throw new Error(`creator_account_id not found.`);

    const contract_code = req.body.data.contract_code + "";
    const eth_address = req.body.data.eth_address + "";
    await api.syncToTip();
    return await api.generateDeployTx(
      creator_account_id.toString(),
      contract_code,
      rollup_type_hash,
      eth_address
    );
  }

  async deploy_erc20_proxy_contract() {
    const req = this.req;
    const api = this.api;

    const creator_account_id = await api.findCreatorAccountId(sudt_id_str);
    if (!creator_account_id) throw new Error(`creator_account_id not found.`);

    const contract_file = path.resolve(
      __dirname,
      "../../configs/bin/newErc20Proxy.bin"
    );
    const contract_code =
      "0x" + (await fs.readFileSync(contract_file).toString("utf-8"));
    await api.syncToTip();
    // get sudt id
    const sudt_script_hash = api.getL2SudtScriptHash(user_private_key);
    const sudt_id = await api.getAccountIdByScriptHash(sudt_script_hash);
    console.log(`sudt_id: ${sudt_id}`);
    if (!sudt_id)
      throw new Error(`sudt account not exits. deposit sudt first.`);

    return await api.generateErc20ProxyContractCode(
      sudt_id + "",
      contract_code
    );
  }

  async deploy_sudt_contract() {
    const req = this.req;
    const api = this.api;

    await api.deployLayer1Sudt(miner_private_key);
    return null;
  }

  async get_layer2_balance() {
    const req = this.req;
    const api = this.api;
    const default_sudt_id = 1;

    const eth_address = req.query.eth_address + "";
    const sudt_id = req.query.sudt_id
      ? parseInt(req.query.sudt_id + "")
      : default_sudt_id;

    const _account_id = await api.getAccountIdByEthAddr(eth_address);
    const account_id = parseInt(_account_id + "");
    if (!account_id) throw new Error(`account not exits. deposit first.`);

    // todo: add block parameter
    const balance = await api.godwoken.getBalance(sudt_id, account_id);
    return balance.toString();
  }

  async get_sudt_token() {
    const req = this.req;
    const api = this.api;

    const sudt_token = api.getL1SudtToken(user_private_key);
    return { sudt_token: sudt_token };
  }

  async get_sudt_token_total_amount() {
    const req = this.req;
    const api = this.api;

    const sudt_token = api.getL1SudtToken(user_private_key);
    const total_amount = await api.getL1SudtTokenTotalAmount(sudt_token);
    return { total_amount: total_amount.toString() };
  }
}
