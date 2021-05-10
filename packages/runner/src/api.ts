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
import { HexString, Cell, Script, Hash, utils, core as ckb_core, OutPoint, TransactionWithStatus } from "@ckb-lumos/base";
import { DeploymentConfig } from "../js/base/index";
import { Indexer, CellCollector } from "@ckb-lumos/indexer";
import { key } from "@ckb-lumos/hd";
import TransactionManager from "@ckb-lumos/transaction-manager";
import {
  TransactionSkeleton,
  parseAddress,
  sealTransaction,
  generateAddress,
  minimalCellCapacity,
  createTransactionFromSkeleton,
  TransactionSkeletonInterface,
  TransactionSkeletonType,
} from "@ckb-lumos/helpers";
import {
  generateDepositionLock,
  DepositionLockArgs,
  getDepositionLockArgs,
  serializeArgs,
  getRollupTypeHash,
  getL2SudtScriptHash,
} from "../js/transactions/deposition";
import { common, sudt } from "@ckb-lumos/common-scripts";
import { RPC, Reader, normalizers as ckb_normalizers } from "ckb-js-toolkit";
import { deploymentConfig } from "../js/utils/deployment_config";
import path from "path";
import { initializeConfig, getConfig } from "@ckb-lumos/config-manager";
import fs from "fs";
import { calcMessage } from "./convert-tx";

import {
  asyncSleep,
  caculateLayer2LockScriptHash,
  serializeScript,
  waitForBlockSync,
  privateKeyToCkbAddress,
  privateKeyToEthAddress,
  toBigUInt64LE,
  deepCompare,
  DeepDiffMapper,
} from "./util";
import { TxReceipt } from "@godwoken-examples/godwoken/schemas/store";

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

  async syncLayer1(reinit:boolean=false) {
    if (process.env.LUMOS_CONFIG_FILE) {
      process.env.LUMOS_CONFIG_FILE = path.resolve(
        process.env.LUMOS_CONFIG_FILE
      );
    }

    initializeConfig();

    var indexerPath;
    if(reinit === true){
      indexerPath = path.resolve(this.indexer_path + `_${Date.now()}`);
    }else{
      indexerPath = path.resolve(this.indexer_path);
    }

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

    console.log(JSON.stringify(tx, null, 2));


    const txHash: Hash = await this.ckb_rpc.send_transaction(tx);

    return txHash;
  }

  async sendSudtTx(
    deploymentConfig: DeploymentConfig,
    fromAddress: string,
    amount: string,
    layer2LockArgs: HexString,
    privateKey: HexString,
    sudtToken: HexString,
    capacity?: bigint
  ) {
    let txSkeleton = TransactionSkeleton({ cellProvider: this.transactionManager });
  
    const ownerLock: Script = parseAddress(fromAddress);
    const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);
    
    const depositionLockArgs: DepositionLockArgs = getDepositionLockArgs(
      ownerLockHash,
      layer2LockArgs
    );
    const l2_lock_script_hash = utils.computeScriptHash(
      depositionLockArgs.layer2_lock
    );
    console.log(
      `Layer 2 lock script hash: ${l2_lock_script_hash}`
    );
    const serializedArgs: HexString = serializeArgs(depositionLockArgs);
    const depositionLock: Script = generateDepositionLock(
      deploymentConfig,
      serializedArgs
    );
  
    const toAddress: string = generateAddress(depositionLock);
  
    txSkeleton = await sudt.transfer(
      txSkeleton,
      [fromAddress],
      sudtToken,
      toAddress,
      BigInt(amount),
      undefined,
      capacity
    );

    console.log(txSkeleton.get("outputs").get(0)!.cell_output.type!);

    const sudtScriptHash = utils.computeScriptHash(
      txSkeleton.get("outputs").get(0)!.cell_output.type!
    );
    console.log(`Layer 1 sudt script hash:`, sudtScriptHash);
    
    const scriptHash = await this.godwoken.getScriptHash(1);
    const script = await this.godwoken.getScript(scriptHash)
    const layer2SudtScript = {
      code_hash: script.code_hash,
      hash_type: script.hash_type,
      args: getRollupTypeHash() + sudtScriptHash.slice(2),
    }
    console.log("layer 2 sudt script:", layer2SudtScript)
    console.log(
      `Layer 2 sudt script hash:`,
      utils.computeScriptHash(layer2SudtScript)
    );
    
    console.log(JSON.stringify(createTransactionFromSkeleton(txSkeleton), null, 2));
    
    console.log("ready to pay fee..");

    txSkeleton = await common.payFee(
      txSkeleton,
      [fromAddress],
      BigInt(1000)
    );
    console.log('pay fee..');

    txSkeleton = common.prepareSigningEntries(txSkeleton);
  
    const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
    const content: HexString = key.signRecoverable(message, privateKey);
  
    const tx = sealTransaction(txSkeleton, [content]);

    console.log(JSON.stringify(tx, null, 2));
  
    const txHash: Hash = await this.ckb_rpc.send_transaction(tx);
  
    return {tx_hash: txHash, l2_sudt_script_hash: utils.computeScriptHash(layer2SudtScript)};
  }

  async smart_payfee(
    txSkeleton: TransactionSkeletonType, 
    fromAddress: string,
    feeRate?: number
  ){
    feeRate = feeRate ? feeRate : 1000;
    try {
      txSkeleton = await common.payFeeByFeeRate(
        txSkeleton,
        [fromAddress],
        BigInt(feeRate)
      );
      console.log('pay fee..');
    } catch (error) {
      
    }
  }
  

  async deposit(
    _privateKey: string,
    _ethAddress: string | undefined, 
    _amount: string) 
  {
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
        throw new Error(`the tx ${txHash} is disapeared from ckb, please re-try.`);
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

    const message = await _generateTransactionMessageToSign(
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
    //const new_account_id = UInt32LEToNumber(run_result.return_data);
    //console.log("Created account id:", new_account_id);

    // wait for confirm
    const l2_script: Script = {
      code_hash: deploymentConfig.polyjuice_validator.code_hash,
      hash_type: deploymentConfig.polyjuice_validator.hash_type as "type" | "data",
      args: getRollupTypeHash() + script_args.slice(2),
    };
    const l2_script_hash = serializeScript(l2_script);
    await this.waitForAccountIdOnChain(l2_script_hash);

    const new_account_id = await this.godwoken.getAccountIdByScriptHash(l2_script_hash);
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
      11121000n, //todo remove hard-code
      50n, //todo remove hard-code
      0n,
      init_code,
      nonce,
      getRollupTypeHash()
    );

    console.log(`gas_limit: `)

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);

    const message = await _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash,
    );
    const signature = _signMessage(message, privkey);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    console.log("L2Transaction", l2tx);
    const tx_hash = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", tx_hash);

    // todo: the method of caculateScriptHash seems go wrong.
    const new_script_hash = this.polyjuice.calculateScriptHash(from_id, nonce, rollup_type_hash);
    console.log("new script hash", new_script_hash);
    if (!tx_hash)
      throw new Error("the return tx_hash of submitL2Transaction is empty.");

    const contract_script_hash = new_script_hash;

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

  async deposit_sudt(
    _privateKey: string,
    _ethAddress: string | undefined, 
    _amount: string,
    _capacity?: string,
  ){
    await this.syncToTip();

    const capacity = _capacity ? BigInt(_capacity) : BigInt(40000000000);
    
    try {
      
      // start deposit sudt with new issue token
      const ckbAddress = privateKeyToCkbAddress(_privateKey);
      const ethAddress = _ethAddress || privateKeyToEthAddress(_privateKey);
      console.log("using eth address:", ethAddress);

      const lockScript = parseAddress(ckbAddress);
      const sudtTokenArgs = utils.computeScriptHash(lockScript);
      console.log(`using sudtTokenArgs: ${sudtTokenArgs}`);

      const {tx_hash, l2_sudt_script_hash} = await this.sendSudtTx(
        deploymentConfig,
        ckbAddress,
        _amount,
        ethAddress.toLowerCase(),
        _privateKey,
        sudtTokenArgs,
        capacity
      );
      console.log(`sent deposit sudt tx.`)
      await this.waitForCkbTx(tx_hash);
      console.log("deposit sudt sucessful!");

      //get deposit account id
      const script_hash = caculateLayer2LockScriptHash(ethAddress);
      console.log(`compute_scripthash: ${script_hash}`);

      // wait for confirm
      await this.waitForAccountIdOnChain(script_hash);
      await this.waitForAccountIdOnChain(l2_sudt_script_hash);

      const account_id = await this.godwoken.getAccountIdByScriptHash(
        script_hash
      );
      
      return {
        account_id: account_id.toString(),
        l2_sudt_script_hash: l2_sudt_script_hash
      }

    } catch (e) {
      throw new Error(e);
    }
    
  }

  async checkIfL1SudtScriptExits(){
    const config = getConfig();
    if(!config.SCRIPTS.SUDT){
        console.error("sudt scripts not found in lumos config, please deploy first.");
        return false;
    }
    //todo: check if sudt cell exits and is live.
    
    return true;
  }

  getL2SudtScriptHash(private_key: string) {
    const lock = parseAddress(privateKeyToCkbAddress(private_key));
    const lock_hash = utils.computeScriptHash(lock);
    const config = getConfig();
    const l1_sudt_script: Script = {
      code_hash: config.SCRIPTS.SUDT!.CODE_HASH,
      hash_type: config.SCRIPTS.SUDT!.HASH_TYPE as "type" | "data",
      args: lock_hash 
    }
    console.log(`l1_sudt_script: ${JSON.stringify(l1_sudt_script)}`);
    return getL2SudtScriptHash(l1_sudt_script);
  }

  async issueToken(
    amount: string,
    privateKey: HexString,
    capacity?: bigint
  ): Promise<Hash> {
    let txSkeleton = TransactionSkeleton({ cellProvider: this.transactionManager });
  
    const address: string = privateKeyToCkbAddress(privateKey);
  
    const sudtScriptArgs: HexString = sudt.ownerForSudt(address);
    console.log("sudt script args:", sudtScriptArgs);
  
    txSkeleton = await sudt.issueToken(
      txSkeleton,
      address,
      BigInt(amount),
      capacity
    );
  
    txSkeleton = await common.payFeeByFeeRate(
      txSkeleton,
      [address],
      BigInt(1000)
    );
  
    txSkeleton = common.prepareSigningEntries(txSkeleton);
  
    const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
    const content: HexString = key.signRecoverable(message, privateKey);
  
    const tx = sealTransaction(txSkeleton, [content]);
  
    const txHash: Hash = await this.ckb_rpc.send_transaction(tx);

    await this.waitForCkbTx(txHash);
    
    const sudt_token = sudtScriptArgs;

    return sudt_token;
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

  async getScriptHashByAccountId(account_id: number) {
    return await this.godwoken.getScriptHash(account_id);
  }

  async getAccountIdByEthAddr(eth_address: string){
    const id = await this.godwoken.getAccountIdByScriptHash(caculateLayer2LockScriptHash(eth_address));
    return id;
  }

  // Wait for tx to land on chain.
  async waitForCkbTx(tx_hash: string){
    var finalized_tx: TransactionWithStatus;
    while (true) {
      await asyncSleep(1000);
      const txWithStatus = await this.ckb_rpc!.get_transaction(tx_hash);
      if(txWithStatus === null){
        throw new Error(`the tx is disapeared from ckb, please re-try.`);
      }

      if (
        txWithStatus &&
        txWithStatus.tx_status &&
        txWithStatus.tx_status.status === "committed"
      ) {
        if(!this.indexer)
          throw new Error("api.indexer is null, please run syncLayer1 first!");
        
        await waitForBlockSync(
          this.indexer,
          this.ckb_rpc!,
          txWithStatus.tx_status.block_hash
        );
        finalized_tx = txWithStatus; 
        break;
      }
    }
    console.log(`tx ${tx_hash} is now onChain!`);
    return finalized_tx;
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

  async waitForTransactionReceipt(tx_hash: Hash){
    while (true) {
      await asyncSleep(1000);
      const tx_receipt = await this.godwoken.getTransactionReceipt(
        tx_hash
      );
      console.log(`tx_receipt: ${tx_receipt}`);

      if (tx_receipt) {
        break;
      }
    }
    return;
  }

  async waitForDeolyedContractOnChain(raw_l2_tx: RawL2Transaction, rollup_type_hash: Hash){
    const from_id = raw_l2_tx.from_id;
    const nonce = raw_l2_tx.nonce;
    const new_script_hash = this.polyjuice!.calculateScriptHash(parseInt(from_id), parseInt(nonce), rollup_type_hash);
    console.log("caculte new script hash", new_script_hash);
    const account_id = await this.watiForDeployTx(new_script_hash);
    console.log("account_id:", account_id);
    return account_id;
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
      nonce,
      getRollupTypeHash()
    );

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);
    
    const message = await _generateTransactionMessageToSign(
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
    rollup_type_hash: Hash,
    add_prefix?: boolean
  ){
    const sender_script_hash = await this.godwoken.getScriptHash(parseInt(raw_l2tx.from_id));
    const receiver_script_hash = await this.godwoken.getScriptHash(parseInt(raw_l2tx.to_id));


    const message = await _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash,
      add_prefix
    );
    return message;
  }

  async sendLayer2Transaction(
    raw_l2tx: RawL2Transaction,
    _signature: Hash
  ) {
    let v = Number.parseInt(_signature.slice(-2), 16);
    if (v >= 27) v -= 27;
    const signature = _signature.slice(0, -2) + v.toString(16).padStart(2, "0");
    const l2tx: L2Transaction = { raw: raw_l2tx, signature: signature };
    const run_result = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    return run_result;
  }

  async getTransactionReceipt(tx_hash: Hash){
    await this.waitForTransactionReceipt(tx_hash);
    return await this.godwoken.getTransactionReceipt(tx_hash);
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
      hash_type: "type",
      args: getRollupTypeHash() + script_args.slice(2),
    };
    const l2_script_hash = serializeScript(l2_script);
    await this.waitForAccountIdOnChain(l2_script_hash);
    const id = await this.getAccountId(l2_script_hash);
    return id;
  }

  async generateDeployErc20ProxyContractTx(
    sudt_id_hex_str: string,
    creator_account_id_str: string,
    init_code: string,
    rollup_type_hash: string,
    eth_address: string,
  ){
    if(sudt_id_hex_str.slice(2).length > 2)
      throw new Error(`sudt_id {sudt_id_hex_str.slice(2)} should be not be larger than 255.`);
      
    const pack_sudt_id = sudt_id_hex_str.slice(2).length === 1 ? '0' + sudt_id_hex_str.slice(2) : sudt_id_hex_str.slice(2); 
    console.log(`sudt_id_pack: ${pack_sudt_id}`);
    let args = `000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000204fce5e3e25026110000000000000000000000000000000000000000000000000000000000000000000000${pack_sudt_id}0000000000000000000000000000000000000000000000000000000000000004746573740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027474000000000000000000000000000000000000000000000000000000000000`;
    let contract_code_with_constructor = init_code.trimEnd().concat(args);
    console.log(`erc20_proxy code: ${contract_code_with_constructor}`);
    return this.generateDeployTx(creator_account_id_str, contract_code_with_constructor, rollup_type_hash, eth_address);
  }

  async generateErc20ProxyContractCode(
    sudt_id_hex_str: string,
    creator_account_id_str: string,
    init_code: string,
    rollup_type_hash: string,
    eth_address: string,
  ){
    if(sudt_id_hex_str.slice(2).length > 2)
      throw new Error(`sudt_id {sudt_id_hex_str.slice(2)} should be not be larger than 255.`);
      
    const pack_sudt_id = sudt_id_hex_str.slice(2).length === 1 ? '0' + sudt_id_hex_str.slice(2) : sudt_id_hex_str.slice(2); 
    console.log(`sudt_id_pack: ${pack_sudt_id}`);
    let args = `000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000204fce5e3e25026110000000000000000000000000000000000000000000000000000000000000000000000${pack_sudt_id}0000000000000000000000000000000000000000000000000000000000000004746573740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027474000000000000000000000000000000000000000000000000000000000000`;
    let contract_code_with_constructor = init_code.trimEnd().concat(args);
    console.log(`erc20_proxy code: ${contract_code_with_constructor}`);
    return contract_code_with_constructor; 
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
    const _from_id = await this.godwoken.getAccountIdByScriptHash(script_hash);
    const from_id = parseInt(_from_id + '');
    if (!from_id) {
      console.log("Can not find account id by script_hash:", script_hash);
      throw new Error(`Can not find account id by script_hash: ${script_hash}`);
    }
    const _nonce = '' + await this.godwoken.getNonce(parseInt(from_id+''));
    const nonce = parseInt(_nonce, 16);
    const raw_l2tx = this.polyjuice.generateTransaction(
      from_id,
      0,
      1000011221000n, //todo remove hard-code
      50n, //todo remove hard-code
      0n,
      init_code,
      nonce,
      getRollupTypeHash()
    );
    console.log(`layer2 tx: ${JSON.stringify(raw_l2tx)}`);

    //const add_prefix_in_message = false; //metamask will add prefix.
    //const message = await this.generateLayer2TransactionMessageToSign(raw_l2tx, rollup_type_hash, add_prefix_in_message);
    //const prefixd_message = await this.generateLayer2TransactionMessageToSign(raw_l2tx, rollup_type_hash);
    //console.log(`prefixd_message: ${prefixd_message}`);
    //console.log(`un_prefix_message: ${message}`);

    // const message = calcMessage({
    //   nonce: '0x' + nonce.toString(16),
    //   gasPrice: '0x' + 50n.toString(16),
    //   gasLimit: '0x' + 1000011221000n.toString(16),
    //   to: '0x',
    //   value: '0x' + 0n.toString(16),
    //   data: init_code,
    //   v: '0x3',
    //   r: '0x',
    //   s: '0x',
    // });
    const message = null;
    console.log(`message: ${message}`);
    

    return {type: 'deploy', raw_l2tx: raw_l2tx, message: message, l2_script_args: eth_address}
  }

  async watiForDeployTx(l2_script_hash: string){
    await this.waitForAccountIdOnChain(l2_script_hash);
    return await this.getAccountId(l2_script_hash);
  }
  
  async findCreateCreatorAccoundId(sudt_id_str: string) {
    const script_args = getRollupTypeHash() + numberToUInt32LE(parseInt(sudt_id_str)).slice(2);
    const l2_script: Script = {
      code_hash: this.validator_code_hash,
      hash_type: "type",
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

  // check if sudt contract already deployed in ckb layer1
  async isLayer1SudtScriptExits(){
    if(!this.indexer)
      throw new Error(`this.indexer not found.`);
    if(!this.transactionManager)
      throw new Error(`this.transactionManager not found.`);
      
    await this.syncToTip();
    let txSkeleton = TransactionSkeleton({ cellProvider: this.transactionManager });
    try {
      // todo: maybe it is not able to check?
    } catch (error) {
      return false;
    }
  }

  async deployLayer1Sudt(
    private_key: string
  ){
    const code_hex = await this.getSudtContractCodeHex();
    await this.deployLayer1ContractWithTypeId(code_hex, private_key);
    return;
  }

  async deployLayer1ContractWithTypeId(
    contract_code_hex: HexString,
    private_key: string,
  ){
    
    var txSkeleton = TransactionSkeleton({ cellProvider: this.transactionManager }); 
    const ckb_address = privateKeyToCkbAddress(private_key);
    const lock: Script = parseAddress(ckb_address);
    
    // "TYPE_ID" in hex
    // pub const TYPE_ID_CODE_HASH: H256 = h256!("0x545950455f4944");
    const type: Script = {
      code_hash: "0x00000000000000000000000000000000000000000000000000545950455f4944",
      hash_type: "type",
      args: '0x' + "0".repeat(64) // inputcell+index
    }

    var outputCell: Cell = {
      cell_output: {
        capacity: "0x000000000001",
        lock: lock,
        type: type
      },
      data: contract_code_hex,
    };

    var capacity;
    try {
      capacity = minimalCellCapacity(outputCell, {validate:false});
      console.log('capacity needed: ', capacity);
      outputCell.cell_output.capacity = '0x' + capacity.toString(16);
    } catch (error) {
      console.log(JSON.stringify(error));
      throw new Error(JSON.stringify(error, null, 2));
    }

    try {
      txSkeleton = await common.injectCapacity(
        txSkeleton,
        [ckb_address],
        capacity
      );
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }

    console.log('inject success!');
    
    if(!txSkeleton.inputs.first())
      throw new Error("txSkeleton.inputs.first() is undefined.");

    const first_input_cell: Cell = txSkeleton.inputs.first();

    const first_cell_input = {
      "since": "0x0",
      "previous_output": first_input_cell.out_point! 
    }

    console.log(first_cell_input);

    const type_id_args_hex = this.generateTypeIDArgsHash(first_cell_input, 1); 
    
    console.log('type_id_args_hex:', type_id_args_hex);

    outputCell.cell_output.type!.args = type_id_args_hex;

    const real_type = outputCell.cell_output.type!;

    console.log(real_type, lock);
    
    const sudt_code_hash = utils.computeScriptHash(real_type);

    console.log(`sudt_code_hash: ${sudt_code_hash}`);

    txSkeleton = txSkeleton.update("outputs", (outputs) => {
      return outputs.push(outputCell);
    });

    txSkeleton = await common.payFeeByFeeRate(
      txSkeleton,
      [ckb_address],
      BigInt(1000)
    );

    txSkeleton = common.prepareSigningEntries(txSkeleton);

    const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
    const content: HexString = key.signRecoverable(message, private_key);

    const tx = sealTransaction(txSkeleton, [content]);

    console.log(JSON.stringify(tx, null, 2));
    
    try {
      const txHash: Hash = await this.ckb_rpc.send_transaction(tx);
      console.log(`txHash ${txHash} is now sent...`);
      const tx_with_status = await this.waitForCkbTx(txHash);
      console.log(JSON.stringify(tx_with_status, null, 2));

      const outpoint: OutPoint = {
        tx_hash: txHash,
        index: '0x1'
      }

      await this.genSudtConfig(outpoint, sudt_code_hash);
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }

  }

  generateTypeIDArgsHash(
    first_cell_input: any,
    first_output_index: number
  ): HexString{
    var first_input_molecule;
    try {
      first_input_molecule = ckb_core.SerializeCellInput(ckb_normalizers.NormalizeCellInput(first_cell_input)); 
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }

    const hasher = new utils.CKBHasher();

    hasher.update(first_input_molecule);
    hasher.update(toBigUInt64LE(first_output_index));
    return hasher.digestHex();
  }

  async genSudtConfig(outpoint: OutPoint, code_hash: HexString){
    const sudt = {
      "CODE_HASH": code_hash,
      "HASH_TYPE": "type",
      "TX_HASH": outpoint.tx_hash,
      "INDEX": outpoint.index,
      "DEP_TYPE": "code"
    }
    const file_path = path.join(__dirname, '../configs/lumos-config.json');
    const file = await fs.readFileSync(file_path);
    var lumos_config = JSON.parse(file.toString('utf-8'));
    lumos_config.SCRIPTS.SUDT = sudt;
    await fs.writeFileSync(file_path, JSON.stringify(lumos_config, null, 2));
    console.log('lumos-config.json has been updated!');
    console.log('re-init lumos...');
    await this.reinit_lumos();
  }

  async reinit_lumos(){
    const origin_config = getConfig();

    this.indexer!.stop();
    this.indexer = null;
    
    const isReInitEnable = true;
    await this.syncLayer1(isReInitEnable);
    
    const new_config = getConfig();
    
    const isConfigChanged = ! deepCompare(origin_config, new_config);
    console.log(`config reload: is config changed ? ${isConfigChanged}`);
    
    if(isConfigChanged){
      const deepDiffMapper: any = new DeepDiffMapper();
      const result = deepDiffMapper.map(origin_config, new_config);
      const diff_parts = await deepDiffMapper.filterDiff(result);
      console.log(`change part is: ${JSON.stringify(diff_parts, null, 2)}`);
    }
  }
  
  async getSudtContractCodeHex(){
    const contract_file = path.join(__dirname, '../configs/simple_udt');
    console.log(contract_file);
    const complied_code = await fs.readFileSync(contract_file);
    return '0x' + complied_code.toString('hex');
  }
  
}
