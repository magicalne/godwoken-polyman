import {
  polymanConfig,
  gwScriptsConfig,
  filePaths,
  rollupTypeHash,
  indexerDbPath,
} from "../base/config";
import { Api } from "../api";
import path from "path";
import { loadJsonFile } from "../base/util";
import fs from "fs";
import { Service } from "./service";
import {
  DEFAULT_EMPTY_ETH_ADDRESS,
  encodeArgs,
  EthTransaction,
  PolyjuiceConfig,
} from "@polyjuice-provider/base";
import { HexNumber, HexString } from "@ckb-lumos/base";
import crypto from "crypto";
import keccak256 from "keccak256";
import Web3 from "web3";
import { PolyjuiceHttpProviderCli } from "@polyjuice-provider/web3";
import { Tester, TestAccount } from "../test-tool";
const Web3EthAbi = require("web3-eth-abi");

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

  //##### from here is test-tool interface
  async get_total_cells_info() {
    const api = this.api;
    return await api.getTotalCells(
      polymanConfig.addresses.user_ckb_devnet_addr
    );
  }

  async give_user_cells() {
    const api = this.api;
    const req = this.req;

    const total = +req.query.total;

    const txHash = await api.sendSplitCells(
      BigInt(100_0000_0000) * BigInt(total),
      total,
      polymanConfig.addresses.miner_private_key,
      polymanConfig.addresses.user_ckb_devnet_addr
    );
    await api.waitForCkbTx(txHash);
    const count = await api.getTotalCells(
      polymanConfig.addresses.user_ckb_devnet_addr
    );

    console.log("deposit for user", `total cells: ${count}`);
    return { txHash, cellsCount: count };
  }

  async prepare_jam_accounts() {
    const api = this.api;
    const req = this.req;

    const total = +req.query.total;
    const accountsFilePath = path.resolve(
      indexerDbPath,
      "./test-accounts.json"
    );

    const tester = new Tester(api, polymanConfig.addresses.miner_private_key);
    await tester.genTestAccounts(total + 1, accountsFilePath);
    const accounts = tester.testAccounts;

    const receiverAddressList = accounts.map((a) => a.ckbAddress);

    const totalAccounts = receiverAddressList.length;
    const totalCap = BigInt("60000000000") * BigInt(totalAccounts);

    const txHash = await api.sendFundAccountsTx(
      totalCap,
      totalAccounts,
      polymanConfig.addresses.miner_private_key,
      receiverAddressList
    );
    await api.waitForCkbTx(txHash);
    return accounts;
  }

  async jam_ckb_network() {
    const api = this.api;
    const req = this.req;

    const total = +req.query.total;

    const accountsFilePath = path.resolve(
      indexerDbPath,
      "./test-accounts.json"
    );
    const accounts = (await loadJsonFile(accountsFilePath)) as TestAccount[];
    if (accounts == null) throw new Error("do prepare_jam_accounts first!");

    const jamTxs = [];
    for (let i = 0; i < total; i++) {
      const privateKey = accounts[i].privateKey;
      // const receiver = accounts[i].ethAddress;
      //const tx = await api.genDepositJamTx(privateKey, receiver, "40000000000"); // 400ckb
      const ckbAddress = accounts[i].ckbAddress; 
      const tx = await api.genJamL1Tx(privateKey, ckbAddress);
      jamTxs.push(tx);
    }
    console.log(`prepare ${jamTxs.length} txs, ready to jam ckb network...`);
    return await api.sendBatchTxs(jamTxs);
  }

  //##### from here is sudt benchmark interface
  async build_deploy() {
    const sudt_id = "0x" + polymanConfig.default_quantity.sudt_id_str;
    const contract_file = path.resolve(
      __dirname,
      "../../configs/bin/newErc20Proxy.bin"
    );
    const contract_code =
      "0x" + (await fs.readFileSync(contract_file).toString("utf-8"));

    const to_deploy_contract_code =
      await this.api.generateErc20ProxyContractCode(sudt_id, contract_code);

    const from = privateKeyToEthAddress(
      polymanConfig.addresses.user_private_key
    );
    const to = DEFAULT_EMPTY_ETH_ADDRESS;
    const gas_limit = "0xffffff";
    const gas_price = "0x00";
    const value = "0x00";

    const eth_tx: EthTransaction = {
      from: from,
      to: to,
      gas: gas_limit,
      gasPrice: gas_price,
      value: value,
      data: to_deploy_contract_code,
    };
    const polyjuiceConfig: PolyjuiceConfig = {
      web3Url: polymanConfig.components.web3.rpc[1],
    };
    const provider = new PolyjuiceHttpProviderCli(
      polymanConfig.components.web3.rpc[1],
      polyjuiceConfig,
      polymanConfig.addresses.user_private_key
    );
    const web3 = new Web3(provider);
    const receipt = await web3.eth.sendTransaction(eth_tx as any);
    console.log("receipt:", receipt);
    const contractAddress = receipt.contractAddress;
    const account_script_hash =
      await this.api.godwokenRpc.gw_get_script_hash_by_short_address(
        contractAddress
      );
    const account_id =
      await this.api.godwokenRpc.gw_get_account_id_by_script_hash(
        account_script_hash
      );
    return {
      proxy_contract_id: account_id,
      proxy_contract_script_hash: account_script_hash,
    };
  }

  async build_transfer() {
    const api = this.api;
    const req = this.req;

    const amount: HexString = this.req.query.amount;
    const from_id: HexNumber = this.req.query.from_id;
    const to_id: HexNumber = this.req.query.to_id;
    const recevier_script_hash: HexString =
      await this.api.getScriptHashByAccountId(parseInt(to_id, 16));

    console.log(
      `amount: ${amount}, from_id: ${from_id}, to_id: ${to_id}, to_script_hash: ${recevier_script_hash}`
    );

    const dummy_from = privateKeyToEthAddress(
      polymanConfig.addresses.user_private_key
    );
    const dummy_to = "0xE0cb80eaAcc32acb57dA171627AA19EF5ec30fCF";
    const recevier_account_address = recevier_script_hash.slice(0, 42);
    const dummy_gas_limit = "0xffffff";
    const dummy_gas_price = "0x00";
    const dummy_value = "0x00";

    const abi_item = {
      inputs: [
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    };
    const data = Web3EthAbi.encodeFunctionCall(abi_item, [
      recevier_account_address,
      amount,
    ]);
    console.log("data", data);
    const dummy_eth_tx: EthTransaction = {
      from: dummy_from,
      to: dummy_to,
      gas: req.gas_limit || dummy_gas_limit,
      gasPrice: req.gas_price || dummy_gas_price,
      value: dummy_value,
      data: data,
    };

    const args = encodeArgs(dummy_eth_tx);
    const nonce = await api.godwoken.getNonce(parseInt(from_id, 16));

    //test
    // const polyjuiceConfig:PolyjuiceConfig = {
    //   web3Url: polymanConfig.components.web3.rpc[1]
    // }
    // const provider = new PolyjuiceHttpProviderCli(polymanConfig.components.web3.rpc[1], polyjuiceConfig, polymanConfig.addresses.user_private_key);
    // const web3 = new Web3(provider);
    // const receipt = await web3.eth.sendTransaction(dummy_eth_tx as any, function(error, hash){
    //   console.log(error, hash)
    // });
    // console.log(receipt);

    return {
      nonce: nonce.toString(),
      args: args,
    };
  }
}

export function privateKeyToEthAddress(privateKey) {
  const ecdh = crypto.createECDH(`secp256k1`);
  ecdh.generateKeys();
  ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
  const publicKey = "0x" + ecdh.getPublicKey("hex", "uncompressed");
  const _ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return _ethAddress;
}
