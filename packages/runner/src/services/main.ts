import {
  polymanConfig,
  gwScriptsConfig,
  filePaths,
  rollupTypeHash,
} from "../base/config";
import { Api } from "../api";
import path from "path";
import { loadJsonFile } from "../base/util";
import fs from "fs";
import { Service } from "./service";

const service_name = "polyjuice";

export class main extends Service {
  constructor(api: Api, name: string = service_name, req?, res?) {
    super(api, name, req, res);
  }

  get_server_configs() {
    return polymanConfig;
  }

  get_rollup_type_hash() {
    return rollupTypeHash;
  }

  get_eth_account_lock() {
    return gwScriptsConfig.eth_account_lock;
  }

  async get_creator_id() {
    return await this.api.findCreatorAccountId(
      polymanConfig.default_quantity.sudt_id_str
    );
  }

  async get_godwoken_config() {
    return await loadJsonFile(filePaths.godwoken_config);
  }

  async get_godwoken_script_deploy_result_file() {
    return await loadJsonFile(filePaths.scripts_deploy_result);
  }

  async deposit() {
    const req = this.req;
    const api = this.api;

    const eth_address = req.query.eth_address + "";
    let amount =
      req.query.amount &&
      BigInt(req.query.amount + "").valueOf() >
        BigInt(polymanConfig.default_quantity.deposit_minimal_capacity)
        ? req.query.amount + ""
        : polymanConfig.default_quantity.deposit_amount;

    const account_id = await api.deposit(
      polymanConfig.addresses.user_private_key,
      eth_address,
      amount
    );
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
      polymanConfig.addresses.miner_ckb_devnet_addr,
      polymanConfig.addresses.miner_private_key,
      polymanConfig.addresses.user_ckb_devnet_addr,
      BigInt(polymanConfig.default_quantity.change_amount)
    );
    const { account_id, l2_sudt_script_hash } = await api.deposit_sudt(
      polymanConfig.addresses.user_private_key,
      eth_address,
      polymanConfig.default_quantity.deposit_amount,
      polymanConfig.default_quantity.deposit_sudt_capacity
    );
    return { account_id, l2_sudt_script_hash };
  }

  async issue_token() {
    const api = this.api;

    const sudt_token = await api.issueToken(
      polymanConfig.default_quantity.issue_sudt_amount,
      polymanConfig.addresses.user_private_key,
      BigInt(polymanConfig.default_quantity.issue_sudt_capacity)
    );
    return { sudt_token: sudt_token };
  }

  async prepare_change_money() {
    const api = this.api;

    await api.giveUserLayer1AccountSomeMoney(
      polymanConfig.addresses.miner_ckb_devnet_addr,
      polymanConfig.addresses.miner_private_key,
      polymanConfig.addresses.user_ckb_devnet_addr,
      BigInt(polymanConfig.default_quantity.change_amount)
    );
    return { amount: polymanConfig.default_quantity.change_amount };
  }

  async create_creator_account() {
    const req = this.req;
    const api = this.api;

    const from_id = req.query.from_id + "";
    return await api.generateCreateCreatorAccountTx(
      from_id,
      polymanConfig.default_quantity.sudt_id_str,
      rollupTypeHash
    );
  }

  async deploy_contract() {
    const req = this.req;
    const api = this.api;

    const creator_account_id = await api.findCreatorAccountId(
      polymanConfig.default_quantity.sudt_id_str
    );
    if (!creator_account_id) throw new Error(`creator_account_id not found.`);

    const contract_code = req.body.data.contract_code + "";
    const eth_address = req.body.data.eth_address + "";
    await api.syncToTip();
    return await api.generateDeployTx(
      creator_account_id.toString(),
      contract_code,
      rollupTypeHash,
      eth_address
    );
  }

  async deploy_erc20_proxy_contract() {
    const api = this.api;

    const creator_account_id = await api.findCreatorAccountId(
      polymanConfig.default_quantity.sudt_id_str
    );
    if (!creator_account_id) throw new Error(`creator_account_id not found.`);

    const contract_file = path.resolve(
      __dirname,
      "../../configs/bin/newErc20Proxy.bin"
    );
    const contract_code =
      "0x" + (await fs.readFileSync(contract_file).toString("utf-8"));
    await api.syncToTip();
    // get sudt id
    const sudt_script_hash = api.getL2SudtScriptHash(
      polymanConfig.addresses.user_private_key
    );
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
    const api = this.api;

    await api.deployLayer1Sudt(polymanConfig.addresses.miner_private_key);
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
    const api = this.api;

    const sudt_token = api.getL1SudtToken(
      polymanConfig.addresses.user_private_key
    );
    return { sudt_token: sudt_token };
  }

  async get_sudt_token_total_amount() {
    const api = this.api;
    const sudt_token = api.getL1SudtToken(
      polymanConfig.addresses.user_private_key
    );
    const total_amount = await api.getL1SudtTokenTotalAmount(sudt_token);
    return { total_amount: total_amount.toString() };
  }
}
