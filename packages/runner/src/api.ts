import {
  _signMessage,
  _generateTransactionMessageToSign,
  _createAccountRawL2Transaction,
  accountScriptHash,
} from "./common";
import {
  core,
  toBuffer,
  Godwoken,
  GodwokenUtils,
  L2Transaction,
  RawL2Transaction,
  RawWithdrawalRequest,
  WithdrawalRequest,
  CreateAccount,
  UInt32LEToNumber,
  numberToUInt32LE,
  u32ToHex,
  RunResult,
  normalizer,
} from "@godwoken-examples/godwoken";
const NormalizeSUDTQuery = normalizer.NormalizeSUDTQuery;
const NormalizeSUDTTransfer = normalizer.NormalizeSUDTTransfer;
//const SUDTQuery = normalizer.SUDTQuery;
//const SUDTTransfer = normalizer.SUDTTransfer;
//const UnoinType = normalizer.UnoinType;
import { Polyjuice } from "@godwoken-examples/polyjuice";

import gpConfig from "../configs/config.json";
import { HexString, Cell, Script, Hash, utils } from "@ckb-lumos/base";
import { DeploymentConfig } from "../js/base/index";
import { Indexer } from "@ckb-lumos/indexer";
import { key } from "@ckb-lumos/hd";
import TransactionManager from "@ckb-lumos/transaction-manager";
import {
  TransactionSkeleton,
  parseAddress,
  sealTransaction,
} from "@ckb-lumos/helpers";
import {
  generateDepositionLock,
  DepositionLockArgs,
  getDepositionLockArgs,
  serializeArgs,
} from "../js/transactions/deposition";
import { common } from "@ckb-lumos/common-scripts";

import { RPC, Reader } from "ckb-js-toolkit";
import { deploymentConfig } from "../js/utils/deployment_config";
import path from "path";
import { initializeConfig } from "@ckb-lumos/config-manager";

import {
  asyncSleep,
  caculateLayer2LockScriptHash,
  serializeScript,
  waitForBlockSync,
  privateKeyToCkbAddress,
  privateKeyToEthAddress,
} from "./util";

export class Api {
  public validator_code_hash: string;
  public ckb_rpc_url: string;
  private ckb_rpc: RPC;
  public godwoken_rpc_url: string;
  public godwoken: Godwoken;
  private indexer: Indexer | null;
  private transactionManager: TransactionManager | null;
  public indexer_path: string;
  public polyjuice: Polyjuice | null;

  constructor(
    _ckb_rpc_url: string,
    _godwoken_rpc: string,
    _indexer_path: string
  ) {
    this.indexer_path = _indexer_path;
    this.ckb_rpc_url = _ckb_rpc_url;
    this.godwoken_rpc_url = _godwoken_rpc;

    this.validator_code_hash = deploymentConfig.polyjuice_validator.code_hash;

    this.indexer = null;
    this.transactionManager = null;
    this.ckb_rpc = new RPC(this.ckb_rpc_url);
    this.godwoken = new Godwoken(this.godwoken_rpc_url);

    this.polyjuice = null;
  }

  async syncLayer1() {
    if (process.env.LUMOS_CONFIG_FILE) {
      process.env.LUMOS_CONFIG_FILE = path.resolve(
        process.env.LUMOS_CONFIG_FILE
      );
    }

    console.log("LUMOS_CONFIG_FILE:", process.env.LUMOS_CONFIG_FILE);

    initializeConfig();

    const indexerPath = path.resolve(this.indexer_path);

    this.indexer = new Indexer(this.ckb_rpc_url, indexerPath);
    this.indexer.startForever();
    this.transactionManager = new TransactionManager(this.indexer)
    this.transactionManager.start();

    console.log("waiting for sync ...");
    await this.indexer.waitForSync();
    console.log("synced ...");
  }

  async syncToTip(){
    if(!this.indexer)throw new Error("indexer not found. do syncLayer1 first!");
    
    await this.indexer.tip();
    console.log('syncd to tip.');
  }

  async waitForGodwokenStart(){
    while (true) {
      await asyncSleep(5000);
      try {
        const res = await this.godwoken.getTipBlockHash();
        if(res){
          console.log(`godwoken has started..`);
          break;
        }
      } catch (error) {
        console.log(`wait for godwoken to start..`);
      }
    }
    return;
  }

  async sendTx(
    deploymentConfig: DeploymentConfig,
    fromAddress: string,
    amount: string,
    layer2LockArgs: HexString,
    privateKey: HexString
  ): Promise<Hash> {
    if(!this.transactionManager)
      throw new Error(`this.transactionManager not found.`);
      
    await this.syncToTip();
    let txSkeleton = TransactionSkeleton({ cellProvider: this.transactionManager });

    const ownerLock: Script = parseAddress(fromAddress);
    const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);
    
    const depositionLockArgs: DepositionLockArgs = getDepositionLockArgs(
      ownerLockHash,
      layer2LockArgs
    );
    console.log(
      `Layer 2 lock script hash: ${utils.computeScriptHash(
        depositionLockArgs.layer2_lock
      )}`
    );
    const serializedArgs: HexString = serializeArgs(depositionLockArgs);
    const depositionLock: Script = generateDepositionLock(
      deploymentConfig,
      serializedArgs
    );

    const outputCell: Cell = {
      cell_output: {
        capacity: "0x" + BigInt(amount).toString(16),
        lock: depositionLock,
      },
      data: "0x",
    };

    txSkeleton = txSkeleton.update("outputs", (outputs) => {
      return outputs.push(outputCell);
    });

    txSkeleton = await common.injectCapacity(
      txSkeleton,
      [fromAddress],
      BigInt(amount)
    );

    txSkeleton = await common.payFeeByFeeRate(
      txSkeleton,
      [fromAddress],
      BigInt(1000)
    );

    txSkeleton = common.prepareSigningEntries(txSkeleton);

    const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
    const content: HexString = key.signRecoverable(message, privateKey);

    const tx = sealTransaction(txSkeleton, [content]);

    const txHash: Hash = await this.ckb_rpc.send_transaction(tx);

    return txHash;
  }

  async deposit(_privateKey: string, _ethAddress: string | undefined, _amount: string) {
    if (!this.indexer) {
      throw new Error("indexer is null, please run syncLayer1 first!");
    }

    const privateKey = _privateKey;
    const ckbAddress = privateKeyToCkbAddress(privateKey);
    const ethAddress = _ethAddress || privateKeyToEthAddress(privateKey);
    console.log("using eth address:", ethAddress);

    const txHash: Hash = await this.sendTx(
      deploymentConfig,
      ckbAddress,
      _amount,
      ethAddress.toLowerCase(),
      privateKey
    );

    console.log(`txHash ${txHash} is sent!`);

    // Wait for tx to land on chain.
    while (true) {
      await asyncSleep(1000);
      const txWithStatus = await this.ckb_rpc!.get_transaction(txHash);
      //console.log('---------------------')
      //console.log(JSON.stringify(txWithStatus, null, 2));
      if(txWithStatus === null){
        throw new Error(`the tx is disapeared from ckb, please re-try.`);
      }

      if (
        txWithStatus &&
        txWithStatus.tx_status &&
        txWithStatus.tx_status.status === "committed"
      ) {
        await waitForBlockSync(
          this.indexer,
          this.ckb_rpc!,
          txWithStatus.tx_status.block_hash
        );
        break;
        //console.log(JSON.stringify(txWithStatus, null, 2));
      }
    }
    console.log(`tx ${txHash} is now onChain!`);

    //get deposit account id
    const script_hash = caculateLayer2LockScriptHash(ethAddress);
    console.log(`compute_scripthash: ${script_hash}`);

    // wait for confirm
    await this.waitForAccountIdOnChain(script_hash);

    const account_id = await this.godwoken.getAccountIdByScriptHash(
      script_hash
    );
    return account_id.toString();
  }

  async createCreatorAccount(
    from_id_str: string,
    sudt_id_str: string,
    rollup_type_hash: string,
    privkey: string
  ) {
    const from_id =  parseInt(from_id_str);
    const nonce = await this.godwoken.getNonce(from_id);
    console.log(nonce);
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));
    const raw_l2tx = _createAccountRawL2Transaction(
      from_id,
      parseInt(nonce+''),
      deploymentConfig.polyjuice_validator.code_hash,
      script_args
    );

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);

    const message = _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash,
    );
    const signature = _signMessage(message, privkey);
    console.log("message", message);
    console.log("signature", signature);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    const run_result = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    const new_account_id = UInt32LEToNumber(run_result.return_data);
    console.log("Created account id:", new_account_id);

    // wait for confirm
    const l2_script: Script = {
      code_hash: deploymentConfig.polyjuice_validator.code_hash,
      hash_type: deploymentConfig.polyjuice_validator.hash_type as "type" | "data",
      args: script_args,
    };
    const l2_script_hash = serializeScript(l2_script);
    await this.waitForAccountIdOnChain(l2_script_hash);

    return new_account_id.toString();
  }

  async deploy(
    creator_account_id_str: string,
    init_code: string,
    rollup_type_hash: string,
    privkey: string,
    eth_address?: string
  ) {
    const creator_account_id = parseInt(creator_account_id_str);
    this.polyjuice = new Polyjuice(this.godwoken, {
      validator_code_hash: deploymentConfig.polyjuice_validator.code_hash,
      sudt_id: 1,
      creator_account_id,
    });
    const script_hash = eth_address
      ? caculateLayer2LockScriptHash(eth_address)
      : accountScriptHash(privkey);
    const from_id = await this.godwoken.getAccountIdByScriptHash(script_hash);
    if (!from_id) {
      console.log("Can not find account id by script_hash:", script_hash);
      throw new Error(`Can not find account id by script_hash: ${script_hash}`);
    }
    const nonce = await this.godwoken.getNonce(from_id);
    const raw_l2tx = this.polyjuice.generateTransaction(
      from_id,
      0,
      21000n, //todo remove hard-code
      50n, //todo remove hard-code
      0n,
      init_code,
      nonce
    );

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);

    const message = _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash,
    );
    const signature = _signMessage(message, privkey);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    console.log("L2Transaction", l2tx);
    const run_result = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);

    // todo: the method of caculateScriptHash seems go wrong.
    // const new_script_hash = this.polyjuice.calculateScriptHash(from_id, nonce);
    // console.log("new script hash", new_script_hash);
    if (!run_result || !run_result.new_scripts)
      throw new Error("run_result or run_result.new_scripts is empty.");

    const contract_script_hash = Object.keys(run_result.new_scripts)[0];

    // wait for confirm
    await this.waitForAccountIdOnChain(contract_script_hash);

    const new_account_id = await this.godwoken.getAccountIdByScriptHash(
      contract_script_hash
    );
    const account_address = await this.polyjuice.accountIdToAddress(
      new_account_id
    );
    console.log(`the contract deployed at address ${account_address}`);
    return account_address;
  }

  initPolyjuice(creator_account_id: number) {
    this.polyjuice = new Polyjuice(this.godwoken, {
      validator_code_hash: this.validator_code_hash,
      sudt_id: 1,
      creator_account_id,
    });
  }

  async getAccountId(script_hash: string) {
    const id = await this.godwoken.getAccountIdByScriptHash(script_hash);
    return id;
  }

  async getAccountIdByEthAddr(eth_address: string){
    const id = await this.godwoken.getAccountIdByScriptHash(caculateLayer2LockScriptHash(eth_address));
    return id;
  }

  async waitForAccountIdOnChain(script_hash: string) {
    while (true) {
      await asyncSleep(1000);
      const new_account_id = await this.godwoken.getAccountIdByScriptHash(
        script_hash
      );
      console.log(`account_id: ${new_account_id}`);

      if (new_account_id) {
        break;
      }
    }
    return;
  }

  async _call(
    method: Function,
    to_id_str: string,
    input_data: string,
    rollup_type_hash: string,
    privkey: string
  ) {
    if (!this.polyjuice)
      throw new Error(
        `Can not find polyjuice instance, please call deploy contract first.`
      );

    const script_hash = accountScriptHash(privkey);
    const from_id = await this.godwoken.getAccountIdByScriptHash(script_hash);
    if (!from_id) {
      console.log("Can not find account id by script_hash:", script_hash);
      throw new Error(`Can not find account id by script_hash: ${script_hash}`);
    }
    const nonce = await this.godwoken.getNonce(from_id);
    const raw_l2tx = this.polyjuice.generateTransaction(
      from_id,
      parseInt(to_id_str),
      21000n, //todo remove hard-code
      50n, //todo remove hard-code
      0n,
      input_data,
      nonce
    );

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);
    
    const message = _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash,
    );
    const signature = _signMessage(message, privkey);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    console.log("L2Transaction", l2tx);
    const run_result = await method(l2tx);
    console.log("RunResult", run_result);
    console.log("return data", run_result.return_data);
    return run_result;
  }

  async call(
    to_id_str: string,
    input_data: string,
    rollup_type_hash: string,
    privkey: string
  ) {
    this._call(
      this.godwoken.submitL2Transaction.bind(this.godwoken),
      to_id_str,
      input_data,
      rollup_type_hash,
      privkey
    );
  }

  async staticCall(
    to_id_str: string,
    input_data: string,
    rollup_type_hash: string,
    privkey: string
  ) {
    this._call(
      this.godwoken.executeL2Transaction.bind(this.godwoken),
      to_id_str,
      input_data,
      rollup_type_hash,
      privkey
    );
  }

  async generateLayer2TransactionMessageToSign(
    raw_l2tx: RawL2Transaction,
    rollup_type_hash: Hash
  ){
    const sender_script_hash = await this.godwoken.getScriptHash(parseInt(raw_l2tx.from_id));
    const receiver_script_hash = await this.godwoken.getScriptHash(parseInt(raw_l2tx.to_id));

    const message = _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash
    );
    return message;
  }

  async sendLayer2Transaction(
    raw_l2tx: RawL2Transaction,
    signature: Hash
  ) {
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    const run_result = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    return run_result;
  }

  /*
  async generateTransferTx(
    sudt_id_str: string,
    to_id_str: string,
    amount_str: string,
    fee_str: string,
    rollup_type_hash: string,
    eth_address: string,
  ) {
    const script_hash = caculateLayer2LockScriptHash(eth_address);
    const fromId = await this.godwoken.getAccountIdByScriptHash(script_hash);
    if (!fromId) {
      console.log("Can not find account id by script_hash:", script_hash);
      throw new Error(`Can not find account id by script_hash: ${script_hash}`);
    }
    const sudtId = parseInt(sudt_id_str);
    const toId = parseInt(to_id_str);
    // TODO: should use big integer
    const amount = parseInt(amount_str);
    // TODO: should use big integer
    const fee = parseInt(fee_str);
    const nonce = await this.godwoken.getNonce(fromId);

    const sudtTransfer: SUDTTransfer = {
      to: "0x" + toId.toString(16),
      amount: "0x" + amount.toString(16),
      fee: "0x" + fee.toString(16),
    };

    const sudtArgs: UnoinType = {
      type: "SUDTTransfer",
      value: NormalizeSUDTTransfer(sudtTransfer),
    };

    const serializedSudtArgs = new Reader(
      core.SerializeSUDTArgs(sudtArgs)
    ).serializeJson();

    console.log("serialized sudt args:", sudtArgs);

    const raw_l2tx: RawL2Transaction = {
      from_id: "0x" + fromId.toString(16),
      to_id: "0x" + sudtId.toString(16),
      nonce: "0x" + nonce.toString(16),
      args: serializedSudtArgs,
    };

    const message = _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash
    );
    return {type: 'transfer', raw_l2tx: raw_l2tx, message: message, l2_script_args: eth_address};
  }
  */

  async generateCreateCreatorAccountTx(
    from_id_str: string,
    sudt_id_str: string,
    rollup_type_hash: string,
  ){
    const from_id = parseInt(from_id_str);
    const nonce = await this.godwoken.getNonce(from_id);
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));
    const raw_l2tx = _createAccountRawL2Transaction(
      from_id,
      nonce,
      deploymentConfig.polyjuice_validator.code_hash,
      script_args
    ); 
    const message = this.generateLayer2TransactionMessageToSign(raw_l2tx, rollup_type_hash);
    return {type: 'create_creator', raw_l2tx: raw_l2tx, message: message, l2_script_args: script_args};
  }

  async waitForCreateCreator(sudt_id_str: string){
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));

    // wait for confirm
    const l2_script: Script = {
      code_hash: this.validator_code_hash,
      hash_type: "data",
      args: script_args,
    };
    const l2_script_hash = serializeScript(l2_script);
    await this.waitForAccountIdOnChain(l2_script_hash);
    const id = await this.getAccountId(l2_script_hash);
    return id;
  }

  async generateDeployTx(
    creator_account_id_str: string,
    init_code: string,
    rollup_type_hash: string,
    eth_address: string,
  ){
    const creator_account_id = parseInt(creator_account_id_str);
    this.polyjuice = new Polyjuice(this.godwoken, {
      validator_code_hash: this.validator_code_hash,
      sudt_id: 1,
      creator_account_id,
    });
    const script_hash = caculateLayer2LockScriptHash(eth_address);
    const from_id = await this.godwoken.getAccountIdByScriptHash(script_hash);
    if (!from_id) {
      console.log("Can not find account id by script_hash:", script_hash);
      throw new Error(`Can not find account id by script_hash: ${script_hash}`);
    }
    const nonce = await this.godwoken.getNonce(from_id);
    const raw_l2tx = this.polyjuice.generateTransaction(
      from_id,
      0,
      21000n, //todo remove hard-code
      50n, //todo remove hard-code
      0n,
      init_code,
      nonce
    );
    const message = this.generateLayer2TransactionMessageToSign(raw_l2tx, rollup_type_hash);
    return {type: 'deploy', raw_l2tx: raw_l2tx, message: message, l2_script_args: eth_address}
  }

  async watiForDeployTx(l2_script_hash: string){
    await this.waitForAccountIdOnChain(l2_script_hash);
    const id = await this.getAccountId(l2_script_hash);
    return id; 
  }
  
  async findCreateCreatorAccoundId(sudt_id_str: string) {
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));
    const l2_script: Script = {
      code_hash: this.validator_code_hash,
      hash_type: "data",
      args: script_args,
    };
    const l2_script_hash = serializeScript(l2_script);
    const id = await this.godwoken.getAccountIdByScriptHash(l2_script_hash);
    return id;
  }

  async giveUserLayer1AccountSomeMoney(miner_address: string, miner_privatekey: string, user_address: string, amount: bigint){
    if(!this.indexer)
      throw new Error(`this.indexer not found.`);
    if(!this.transactionManager)
      throw new Error(`this.transactionManager not found.`);
      
    await this.syncToTip();
    let txSkeleton = TransactionSkeleton({ cellProvider: this.transactionManager });
    txSkeleton = await common.transfer(txSkeleton, [miner_address], user_address, amount);
    txSkeleton = await common.payFeeByFeeRate(
      txSkeleton,
      [miner_address],
      BigInt(1000)
    );
    txSkeleton = common.prepareSigningEntries(txSkeleton);
    const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
    const content: HexString = key.signRecoverable(message, miner_privatekey);
    const tx = sealTransaction(txSkeleton, [content]);
    const txHash: Hash = await this.ckb_rpc.send_transaction(tx);
    console.log(`txHash ${txHash} is sent!`);

    // Wait for tx to land on chain.
    while (true) {
      await asyncSleep(1000);
      const txWithStatus = await this.ckb_rpc!.get_transaction(txHash);
      console.log('---------------------')
      console.log(JSON.stringify(txWithStatus, null, 2));
      if(txWithStatus === null){
        throw new Error(`the tx is disapeared from ckb, please re-try.`);
      }

      if (
        txWithStatus &&
        txWithStatus.tx_status &&
        txWithStatus.tx_status.status === "committed"
      ) {
        await waitForBlockSync(
          this.indexer,
          this.ckb_rpc!,
          txWithStatus.tx_status.block_hash
        );
        break;
      }
    }
    console.log(`tx ${txHash} is now onChain!`);
  }

  // check if an address's balance meets the requirment.
  async checkCkbBalance(ckb_address: string, amount: bigint){
    if(!this.indexer)
      throw new Error(`this.indexer not found.`);
    if(!this.transactionManager)
      throw new Error(`this.transactionManager not found.`);
      
    await this.syncToTip();
    let txSkeleton = TransactionSkeleton({ cellProvider: this.transactionManager });
    try {
      txSkeleton = await common.injectCapacity(
        txSkeleton,
        [ckb_address],
        amount
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}
