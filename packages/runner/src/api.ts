import {
  _signMessage,
  _generateTransactionMessageToSign,
  _createAccountRawL2Transaction,
  accountScriptHash,
  calculateLayer2LockScriptHash,
  serializeScript,
  generateCkbAddress,
  generateEthAddress,
} from "./base/common";
import {
  Godwoken,
  L2Transaction,
  RawL2Transaction,
  numberToUInt32LE,
} from "@godwoken-polyman/godwoken";
import { Polyjuice } from "@godwoken-polyman/polyjuice";

import {
  HexString,
  Cell,
  Script,
  Hash,
  utils,
  core as ckb_core,
  OutPoint,
  TransactionWithStatus,
} from "@ckb-lumos/base";
import { GwScriptsConfig } from "./base/types/conf";
import { rollupTypeHash } from "./base/config";
import { Indexer, CellCollector } from "@ckb-lumos/indexer";
import { key } from "@ckb-lumos/hd";
import TransactionManager from "@ckb-lumos/transaction-manager";
import {
  TransactionSkeleton,
  parseAddress,
  sealTransaction,
  generateAddress,
  minimalCellCapacity,
  TransactionSkeletonType,
} from "@ckb-lumos/helpers";
import {
  generateDepositLock,
  DepositLockArgs,
  getDepositLockArgs,
  serializeArgs,
  getL2SudtScriptHash,
} from "./base/deposit";
import { common, sudt } from "@ckb-lumos/common-scripts";
import { RPC, normalizers as ckb_normalizers } from "ckb-js-toolkit";
import { gwScriptsConfig } from "./base/config";
import path from "path";
import { initializeConfig, getConfig } from "@ckb-lumos/config-manager";
import fs from "fs";
import { URL } from "url";

import {
  asyncSleep,
  waitForBlockSync,
  toBigUInt64LE,
  deepCompare,
  DeepDiffMapper,
} from "./base/util";
import { ScriptDeploymentTransactionInfo } from "./base/types/gw";

export interface DepositTxResult {
  txHash: HexString;
  ethAddress: HexString;
}

export class Api {
  public validator_code_hash: string;
  public ckb_rpc_url: string;
  public ckb_rpc: RPC;
  public godwokenRpc: RPC;
  public godwoken_rpc_url: string;
  public godwoken: Godwoken;
  public indexer: Indexer | null;
  public transactionManager: TransactionManager | null;
  public indexer_path: string;
  public polyjuice: Polyjuice | null;

  constructor(
    _ckb_rpc_url: string,
    _godwoken_rpc: string,
    _godwoken_web3_rpc_url: string,
    _indexer_path: string
  ) {
    this.indexer_path = _indexer_path;
    this.ckb_rpc_url = _ckb_rpc_url;
    this.godwoken_rpc_url = _godwoken_rpc;

    this.validator_code_hash = gwScriptsConfig.polyjuice_validator.code_hash;

    this.indexer = null;
    this.transactionManager = null;
    this.ckb_rpc = new RPC(this.ckb_rpc_url);

    if (this.isTestnet) {
      this.godwokenRpc = new RPC(_godwoken_web3_rpc_url);
    } else {
      this.godwokenRpc = new RPC(_godwoken_rpc); // in kicker we can remove the deps for web3
    }
    this.godwoken = new Godwoken(this.godwoken_rpc_url);

    this.polyjuice = null;
  }

  public get isTestnet(): Boolean {
    return this.ckb_rpc_url.includes("testnet.ckb.dev");
  }

  /**
   * getAccountIdByScriptHash using Godwoken Web3 RPC
   */
  public async getAccountIdByScriptHash(
    scriptHash: Hash
  ): Promise<number | null> {
    const accountID = await this.godwokenRpc
      .gw_get_account_id_by_script_hash(scriptHash)
      .catch(console.error);

    if (
      accountID &&
      typeof accountID === "string" &&
      accountID.startsWith("0x")
    ) {
      console.log(`getAccountIdByScriptHash => ${accountID}`);
      return parseInt(accountID, 16);
    } else {
      return null;
    }
  }

  async syncLayer1(reinit: boolean = false) {
    if (!process.env.LUMOS_CONFIG_NAME && !process.env.LUMOS_CONFIG_FILE) {
      process.env.LUMOS_CONFIG_NAME = "AGGRON4";
      console.log(
        "use default LUMOS_CONFIG_NAME:",
        process.env.LUMOS_CONFIG_NAME
      );
    }
    if (process.env.LUMOS_CONFIG_FILE) {
      process.env.LUMOS_CONFIG_FILE = path.resolve(
        process.env.LUMOS_CONFIG_FILE
      );
    }

    initializeConfig();

    let indexerPath;
    if (reinit === true) {
      indexerPath = path.resolve(this.indexer_path + `_${Date.now()}`);
    } else {
      indexerPath = path.resolve(this.indexer_path);
    }

    // enable HTTP/HTTPS persistent connection to CKB RPC
    const http = require("http");
    const keepAliveAgent = new http.Agent({ keepAlive: true });
    const https = require("https");
    const httpsAliveAgent = new https.Agent({ keepAlive: true });
    const aliveAgent = function (_parsedURL) {
      if (_parsedURL.protocol == "http:") {
        return keepAliveAgent;
      } else {
        return httpsAliveAgent;
      }
    };
    this.indexer = new Indexer(this.ckb_rpc_url, indexerPath, {
      rpcOptions: {
        agent: aliveAgent(new URL(this.ckb_rpc_url)),
      },
    });

    this.indexer.startForever();
    this.transactionManager = new TransactionManager(this.indexer);
    this.transactionManager.start();

    console.log("waiting for sync ...");
    await this.indexer.waitForSync();
    console.log("synced ...");
  }

  async syncToTip() {
    if (!this.indexer)
      throw new Error("indexer not found. do syncLayer1 first!");

    this.indexer
      .tip()
      .then((tip) => {
        console.log("indexer.tip:", tip ? BigInt(tip.block_number) : 0n);
      })
      .catch(console.error);

    await this.indexer.waitForSync();
    console.log("synced to tip.");
  }

  async waitForGodwokenStart() {
    if (this.isTestnet) return;

    while (true) {
      await asyncSleep(5000);
      try {
        const res = await this.godwoken.getTipBlockHash();
        if (res) {
          console.log(`godwoken has started..`);
          break;
        }
      } catch (error) {
        console.log(`wait for godwoken to start..`);
      }
    }
  }

  async sendTx(
    deploymentConfig: GwScriptsConfig,
    fromAddress: string,
    amount: string,
    layer2LockArgs: HexString,
    privateKey: HexString
  ): Promise<Hash> {
    if (!this.transactionManager)
      throw new Error(`this.transactionManager not found.`);

    await this.syncToTip();
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });

    const ownerLock: Script = parseAddress(fromAddress);
    const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);

    const depositLockArgs: DepositLockArgs = getDepositLockArgs(
      ownerLockHash,
      layer2LockArgs
    );
    // console.log(
    //   `Layer 2 lock script hash: ${utils.computeScriptHash(
    //     depositLockArgs.layer2_lock
    //   )}`
    // );
    const serializedArgs: HexString = serializeArgs(depositLockArgs);
    const depositLock: Script = generateDepositLock(
      deploymentConfig,
      serializedArgs
    );

    const outputCell: Cell = {
      cell_output: {
        capacity: "0x" + BigInt(amount).toString(16),
        lock: depositLock,
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

    const txHash: Hash = await this.transactionManager.send_transaction(tx);
    return txHash;
  }

  async sendSudtTx(
    deploymentConfig: GwScriptsConfig,
    fromAddress: string,
    amount: string,
    layer2LockArgs: HexString,
    privateKey: HexString,
    sudtToken: HexString,
    capacity?: bigint
  ) {
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });

    const ownerLock: Script = parseAddress(fromAddress);
    const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);

    const depositLockArgs: DepositLockArgs = getDepositLockArgs(
      ownerLockHash,
      layer2LockArgs
    );
    const serializedArgs: HexString = serializeArgs(depositLockArgs);
    const depositLock: Script = generateDepositLock(
      deploymentConfig,
      serializedArgs
    );

    const toAddress: string = generateAddress(depositLock);

    txSkeleton = await sudt.transfer(
      txSkeleton,
      [fromAddress],
      sudtToken,
      toAddress,
      BigInt(amount),
      undefined,
      capacity
    );

    const sudtScriptHash = utils.computeScriptHash(
      txSkeleton.get("outputs").get(0)!.cell_output.type!
    );

    const scriptHash = await this.godwoken.getScriptHash(1);
    const script = await this.godwoken.getScript(scriptHash);
    const layer2SudtScript = {
      code_hash: script.code_hash,
      hash_type: script.hash_type,
      args: rollupTypeHash + sudtScriptHash.slice(2),
    };

    txSkeleton = await common.payFeeByFeeRate(
      txSkeleton,
      [fromAddress],
      BigInt(1000)
    );

    txSkeleton = common.prepareSigningEntries(txSkeleton);

    const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
    const content: HexString = key.signRecoverable(message, privateKey);

    const tx = sealTransaction(txSkeleton, [content]);

    const txHash: Hash = await this.ckb_rpc.send_transaction(tx, "passthrough");

    return {
      tx_hash: txHash,
      l2_sudt_script_hash: utils.computeScriptHash(layer2SudtScript),
    };
  }

  async smart_payfee(
    txSkeleton: TransactionSkeletonType,
    fromAddress: string,
    feeRate?: number
  ) {
    feeRate = feeRate ? feeRate : 1000;
    try {
      txSkeleton = await common.payFeeByFeeRate(
        txSkeleton,
        [fromAddress],
        BigInt(feeRate)
      );
      console.log("pay fee..");
    } catch (error) {}
  }

  async deposit(
    _privateKey: string,
    _ethAddress: string | undefined,
    _amount: string
  ) {
    if (!this.indexer) {
      throw new Error("indexer is null, please run syncLayer1 first!");
    }

    const privateKey = _privateKey;
    const ckbAddress = generateCkbAddress(privateKey);
    const ethAddress = _ethAddress || generateEthAddress(privateKey);
    console.log("using eth address:", ethAddress);

    const txHash: Hash = await this.sendTx(
      gwScriptsConfig,
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
      if (txWithStatus === null) {
        throw new Error(
          `the tx ${txHash} is disappeared from ckb, please re-try.`
        );
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

    //get deposit account id
    const script_hash = calculateLayer2LockScriptHash(ethAddress);

    // wait for confirm
    await this.waitForAccountIdOnChain(script_hash);

    const account_id = await this.getAccountIdByScriptHash(script_hash);
    return account_id.toString();
  }

  async generateDepositTx(
    _privateKey: string,
    _ethAddress: string | undefined,
    _amount: string
  ): Promise<DepositTxResult> {
    if (!this.indexer) {
      throw new Error("indexer is null, please run syncLayer1 first!");
    }

    const privateKey = _privateKey;
    const ckbAddress = generateCkbAddress(privateKey);
    const ethAddress = _ethAddress || generateEthAddress(privateKey);
    console.log("using eth address:", ethAddress);

    const txHash: Hash = await this.sendTx(
      gwScriptsConfig,
      ckbAddress,
      _amount,
      ethAddress.toLowerCase(),
      privateKey
    );

    console.log(`txHash ${txHash} is sent!`);

    return { txHash, ethAddress };
  }

  async checkDepositByTxHash(txHash: HexString, ethAddress: HexString) {
    let tx;
    // Wait for tx to land on chain.
    while (true) {
      await asyncSleep(1000);
      const txWithStatus = await this.ckb_rpc!.get_transaction(txHash);
      if (txWithStatus === null) {
        throw new Error(
          `the tx ${txHash} is disappeared from ckb, please re-try.`
        );
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
        tx = txWithStatus;
        break;
      }
    }
    console.log(`tx ${txHash} is now onChain!`);

    //get deposit account id
    const script_hash = calculateLayer2LockScriptHash(ethAddress);

    // wait for confirm
    await this.waitForAccountIdOnChain(script_hash);

    const account_id = await this.getAccountIdByScriptHash(script_hash);
    return account_id.toString();
  }

  async createCreatorAccount(
    from_id_str: string,
    sudt_id_str: string,
    rollup_type_hash: string,
    privkey: string
  ) {
    const from_id = parseInt(from_id_str);
    const nonce = await this.godwoken.getNonce(from_id);
    console.log(nonce);
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));
    const raw_l2tx = _createAccountRawL2Transaction(
      from_id,
      parseInt(nonce + ""),
      gwScriptsConfig.polyjuice_validator.code_hash,
      script_args
    );

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);

    const message = await _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash
    );
    const signature = _signMessage(message, privkey);
    console.log("message", message);
    console.log("signature", signature);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    console.log(l2tx);
    const run_result = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    //const new_account_id = UInt32LEToNumber(run_result.return_data);
    //console.log("Created account id:", new_account_id);

    // wait for confirm
    const l2_script: Script = {
      code_hash: gwScriptsConfig.polyjuice_validator.code_hash,
      hash_type: gwScriptsConfig.polyjuice_validator.hash_type as
        | "type"
        | "data",
      args: rollupTypeHash + script_args.slice(2),
    };
    const l2_script_hash = serializeScript(l2_script);
    await this.waitForAccountIdOnChain(l2_script_hash);

    const new_account_id = await this.getAccountIdByScriptHash(l2_script_hash);
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
      validator_code_hash: gwScriptsConfig.polyjuice_validator.code_hash,
      sudt_id: 1,
      creator_account_id,
    });
    const script_hash = eth_address
      ? calculateLayer2LockScriptHash(eth_address)
      : accountScriptHash(privkey);
    const from_id = await this.getAccountIdByScriptHash(script_hash);
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
      rollupTypeHash
    );

    console.log(`gas_limit: `);

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);

    const message = await _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash
    );
    const signature = _signMessage(message, privkey);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    console.log("L2Transaction", l2tx);
    const tx_hash = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", tx_hash);

    // todo: the method of caculateScriptHash seems go wrong.
    const new_script_hash = this.polyjuice.calculateScriptHash(
      from_id,
      nonce,
      rollup_type_hash
    );
    console.log("new script hash", new_script_hash);
    if (!tx_hash)
      throw new Error("the return tx_hash of submitL2Transaction is empty.");

    const contract_script_hash = new_script_hash;

    // wait for confirm
    await this.waitForAccountIdOnChain(contract_script_hash);

    const new_account_id = await this.getAccountIdByScriptHash(
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
    _capacity?: string
  ) {
    await this.syncToTip();

    const capacity = _capacity ? BigInt(_capacity) : BigInt(40000000000);

    try {
      // start deposit sudt with new issue token
      const ckbAddress = generateCkbAddress(_privateKey);
      const ethAddress = _ethAddress || generateEthAddress(_privateKey);
      console.log("using eth address:", ethAddress);

      const lockScript = parseAddress(ckbAddress);
      const sudtTokenArgs = utils.computeScriptHash(lockScript);
      console.log(`using sudtTokenArgs: ${sudtTokenArgs}`);

      const { tx_hash, l2_sudt_script_hash } = await this.sendSudtTx(
        gwScriptsConfig,
        ckbAddress,
        _amount,
        ethAddress.toLowerCase(),
        _privateKey,
        sudtTokenArgs,
        capacity
      );
      console.log(`sent deposit sudt tx.`);
      await this.waitForCkbTx(tx_hash);
      console.log("deposit sudt sucessful!");

      //get deposit account id
      const script_hash = calculateLayer2LockScriptHash(ethAddress);

      // wait for confirm
      await this.waitForAccountIdOnChain(script_hash);
      await this.waitForAccountIdOnChain(l2_sudt_script_hash);

      const account_id = await this.getAccountIdByScriptHash(script_hash);

      return {
        account_id: account_id.toString(),
        l2_sudt_script_hash: l2_sudt_script_hash,
      };
    } catch (e) {
      throw new Error(e);
    }
  }

  async checkIfL1SudtScriptExist(ckb_rpc_url: string) {
    const config = getConfig();
    if (!config.SCRIPTS.SUDT) {
      console.error(
        "sudt scripts not found in lumos config, please deploy first."
      );
      return false;
    }

    // check if sudt cell exits and is live
    const rpc = new RPC(ckb_rpc_url);
    const result = await rpc.get_transaction(config.SCRIPTS.SUDT.TX_HASH);
    if (!result) {
      console.log(
        "sudt transaction not found, lumos file must be out of dated."
      );
      return false;
    }

    const cell =
      result.transaction.outputs[parseInt(config.SCRIPTS.SUDT.INDEX, 16)];
    console.log(JSON.stringify(cell, null, 2));
    if (!cell) {
      console.log("sudt cell not found!");
      return false;
    }

    return true;
  }

  getL2SudtScriptHash(private_key: string) {
    const lock = parseAddress(generateCkbAddress(private_key));
    const lock_hash = utils.computeScriptHash(lock);
    const config = getConfig();
    const l1_sudt_script: Script = {
      code_hash: config.SCRIPTS.SUDT!.CODE_HASH,
      hash_type: config.SCRIPTS.SUDT!.HASH_TYPE as "type" | "data",
      args: lock_hash,
    };
    console.log(`l1_sudt_script: ${JSON.stringify(l1_sudt_script)}`);
    return getL2SudtScriptHash(l1_sudt_script);
  }

  getL1SudtToken(private_key: string) {
    const lock = parseAddress(generateCkbAddress(private_key));
    const lock_hash = utils.computeScriptHash(lock);
    return lock_hash;
  }

  async getL1SudtTokenTotalAmount(sudt_token: string) {
    const lumos_config = getConfig();
    if (!lumos_config.SCRIPTS.SUDT) {
      throw new Error("SUDT scripts not exits in lumos config file.");
    }

    const type_script: Script = {
      code_hash: lumos_config.SCRIPTS.SUDT.CODE_HASH,
      hash_type: lumos_config.SCRIPTS.SUDT.HASH_TYPE,
      args: sudt_token,
    };

    // find cell with sudt
    const cellCollector = new CellCollector(this.indexer, {
      type: type_script,
    });

    let capacity = 0n;

    for await (const cell of cellCollector.collect()) {
      const c = BigInt(
        "0x" + cell.data.slice(2).match(/../g).reverse().join("")
      );
      capacity = capacity + c;
    }

    return capacity;
  }

  async issueToken(
    amount: string,
    privateKey: HexString,
    capacity?: bigint
  ): Promise<Hash> {
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });

    const address: string = generateCkbAddress(privateKey);

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

    const txHash: Hash = await this.ckb_rpc.send_transaction(tx, "passthrough");

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
    const id = await this.getAccountIdByScriptHash(script_hash);
    return id;
  }

  async getScriptHashByAccountId(account_id: number) {
    return await this.godwoken.getScriptHash(account_id);
  }

  async getAccountIdByEthAddr(eth_address: string) {
    const id = await this.getAccountIdByScriptHash(
      calculateLayer2LockScriptHash(eth_address)
    );
    return id;
  }

  // Wait for tx to land on chain.
  async waitForCkbTx(tx_hash: string) {
    let finalized_tx: TransactionWithStatus;
    while (true) {
      await asyncSleep(1000);
      const txWithStatus = await this.ckb_rpc!.get_transaction(tx_hash);
      if (txWithStatus === null) {
        throw new Error(`the tx is disapeared from ckb, please re-try.`);
      }

      if (
        txWithStatus &&
        txWithStatus.tx_status &&
        txWithStatus.tx_status.status === "committed"
      ) {
        if (!this.indexer)
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
      const new_account_id = await this.getAccountIdByScriptHash(script_hash);
      console.log(`try fetching account_id: ${new_account_id}`);

      if (new_account_id) {
        break;
      }
    }
    return;
  }

  async waitForTransactionReceipt(tx_hash: Hash) {
    while (true) {
      await asyncSleep(1000);
      const tx_receipt = await this.godwoken.getTransactionReceipt(tx_hash);
      console.log(`tx_receipt: ${tx_receipt}`);

      if (tx_receipt) {
        break;
      }
    }
    return;
  }

  async waitForDeolyedContractOnChain(
    raw_l2_tx: RawL2Transaction,
    rollup_type_hash: Hash
  ) {
    const from_id = raw_l2_tx.from_id;
    const nonce = raw_l2_tx.nonce;
    const new_script_hash = this.polyjuice!.calculateScriptHash(
      parseInt(from_id),
      parseInt(nonce),
      rollup_type_hash
    );
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
    const from_id = await this.getAccountIdByScriptHash(script_hash);
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
      rollupTypeHash
    );

    const sender_script_hash = await this.godwoken.getScriptHash(from_id);
    const receiver_script_hash = await this.godwoken.getScriptHash(0);

    const message = await _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash
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
  ) {
    const sender_script_hash = await this.godwoken.getScriptHash(
      parseInt(raw_l2tx.from_id)
    );
    const receiver_script_hash = await this.godwoken.getScriptHash(
      parseInt(raw_l2tx.to_id)
    );

    const message = await _generateTransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash,
      sender_script_hash,
      receiver_script_hash,
      add_prefix
    );
    return message;
  }

  async sendLayer2Transaction(raw_l2tx: RawL2Transaction, _signature: Hash) {
    let v = Number.parseInt(_signature.slice(-2), 16);
    if (v >= 27) v -= 27;
    const signature = _signature.slice(0, -2) + v.toString(16).padStart(2, "0");
    const l2tx: L2Transaction = { raw: raw_l2tx, signature: signature };
    const run_result = await this.godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    return run_result;
  }

  async getTransactionReceipt(tx_hash: Hash) {
    await this.waitForTransactionReceipt(tx_hash);
    return await this.godwoken.getTransactionReceipt(tx_hash);
  }

  async generateCreateCreatorAccountTx(
    from_id_str: string,
    sudt_id_str: string,
    rollup_type_hash: string
  ) {
    const from_id = parseInt(from_id_str);
    const nonce = await this.godwoken.getNonce(from_id);
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));
    const raw_l2tx = _createAccountRawL2Transaction(
      from_id,
      nonce,
      gwScriptsConfig.polyjuice_validator.code_hash,
      script_args
    );
    const message = this.generateLayer2TransactionMessageToSign(
      raw_l2tx,
      rollup_type_hash
    );
    return {
      type: "create_creator",
      raw_l2tx: raw_l2tx,
      message: message,
      l2_script_args: script_args,
    };
  }

  async waitForCreateCreator(sudt_id_str: string) {
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));

    // wait for confirm
    const l2_script: Script = {
      code_hash: this.validator_code_hash,
      hash_type: "type",
      args: rollupTypeHash + script_args.slice(2),
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
    eth_address: string
  ) {
    if (sudt_id_hex_str.slice(2).length > 2)
      throw new Error(
        `sudt_id {sudt_id_hex_str.slice(2)} should be not be larger than 255.`
      );

    const pack_sudt_id =
      sudt_id_hex_str.slice(2).length === 1
        ? "0" + sudt_id_hex_str.slice(2)
        : sudt_id_hex_str.slice(2);
    let args = `000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000204fce5e3e25026110000000000000000000000000000000000000000000000000000000000000000000000${pack_sudt_id}0000000000000000000000000000000000000000000000000000000000000004746573740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027474000000000000000000000000000000000000000000000000000000000000`;
    let contract_code_with_constructor = init_code.trimEnd().concat(args);
    return this.generateDeployTx(
      creator_account_id_str,
      contract_code_with_constructor,
      rollup_type_hash,
      eth_address
    );
  }

  async generateErc20ProxyContractCode(
    sudt_id_hex_str: string,
    init_code: string
  ) {
    if (sudt_id_hex_str.slice(2).length > 2)
      throw new Error(
        `sudt_id {sudt_id_hex_str.slice(2)} should be not be larger than 255.`
      );

    const pack_sudt_id =
      sudt_id_hex_str.slice(2).length === 1
        ? "0" + sudt_id_hex_str.slice(2)
        : sudt_id_hex_str.slice(2);
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
    eth_address: string
  ) {
    const creator_account_id = parseInt(creator_account_id_str);
    this.polyjuice = new Polyjuice(this.godwoken, {
      validator_code_hash: this.validator_code_hash,
      sudt_id: 1,
      creator_account_id,
    });
    const script_hash = calculateLayer2LockScriptHash(eth_address);
    const _from_id = await this.getAccountIdByScriptHash(script_hash);
    const from_id = parseInt(_from_id + "");
    if (!from_id) {
      console.log("Can not find account id by script_hash:", script_hash);
      throw new Error(`Can not find account id by script_hash: ${script_hash}`);
    }
    const _nonce = "" + (await this.godwoken.getNonce(parseInt(from_id + "")));
    const nonce = parseInt(_nonce, 16);
    const raw_l2tx = this.polyjuice.generateTransaction(
      from_id,
      0,
      1000011221000n, //todo remove hard-code
      50n, //todo remove hard-code
      0n,
      init_code,
      nonce,
      rollupTypeHash
    );
    console.log(`layer2 tx: ${JSON.stringify(raw_l2tx)}`);
    return {
      type: "deploy",
      raw_l2tx: raw_l2tx,
      message: null,
      l2_script_args: eth_address,
    };
  }

  async watiForDeployTx(l2_script_hash: string) {
    await this.waitForAccountIdOnChain(l2_script_hash);
    return await this.getAccountId(l2_script_hash);
  }

  async findCreatorAccountId(sudt_id_str: string) {
    const script_args =
      rollupTypeHash + numberToUInt32LE(parseInt(sudt_id_str)).slice(2);
    const l2_script: Script = {
      code_hash: this.validator_code_hash,
      hash_type: "type",
      args: script_args,
    };
    const l2_script_hash = serializeScript(l2_script);

    return await this.getAccountIdByScriptHash(l2_script_hash);
  }

  async giveUserLayer1AccountSomeMoney(
    miner_address: string,
    miner_privatekey: string,
    user_address: string,
    amount: bigint
  ) {
    if (!this.indexer) throw new Error(`this.indexer not found.`);
    if (!this.transactionManager)
      throw new Error(`this.transactionManager not found.`);

    await this.syncToTip();
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });
    txSkeleton = await common.transfer(
      txSkeleton,
      [miner_address],
      user_address,
      amount
    );
    txSkeleton = await common.payFeeByFeeRate(
      txSkeleton,
      [miner_address],
      BigInt(1000)
    );
    txSkeleton = common.prepareSigningEntries(txSkeleton);
    const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
    const content: HexString = key.signRecoverable(message, miner_privatekey);
    const tx = sealTransaction(txSkeleton, [content]);
    const txHash: Hash = await this.ckb_rpc.send_transaction(tx, "passthrough");
    console.log(`txHash ${txHash} is sent!`);

    // Wait for tx to land on chain.
    while (true) {
      await asyncSleep(1000);
      const txWithStatus = await this.ckb_rpc!.get_transaction(txHash);
      if (txWithStatus === null) {
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

  // check if an address's balance meets the requirement.
  async checkCkbBalance(ckb_address: string, amount: bigint) {
    if (!this.indexer) throw new Error(`this.indexer not found.`);
    if (!this.transactionManager)
      throw new Error(`this.transactionManager not found.`);

    await this.syncToTip();
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });
    try {
      await common.injectCapacity(txSkeleton, [ckb_address], amount);
      return true;
    } catch (error) {
      return false;
    }
  }

  async deployLayer1Sudt(private_key: string) {
    const code_hash = await this.getSudtContractCodeHex();
    let that = this;
    const callback = async (outpoint: OutPoint, script_hash: HexString) => {
      await that.genSudtConfig(outpoint, script_hash);
    };
    await this.deployLayer1ContractWithTypeId(code_hash, private_key, callback);
    return;
  }

  async checkIfScriptCellExist(
    script_cell_outpoint: OutPoint,
    ckb_rpc_url: string
  ) {
    // check if script cell exist and is alive
    const rpc = new RPC(ckb_rpc_url);
    const result = await rpc.get_transaction(script_cell_outpoint.tx_hash);
    if (!result) {
      console.log(`cell transaction not found: ${result}, script not exist.`);
      return false;
    }

    const cell =
      result.transaction.outputs[parseInt(script_cell_outpoint.index, 16)];
    if (!cell) {
      console.log(`script cell not found: ${cell}, script not exist.`);
      return false;
    }

    return true;
  }

  // send some meaningless layer1 tx to jam ckb node
  async sendJamL1Tx(private_key: string) {
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });
    const ckb_address = generateCkbAddress(private_key);
    const lock: Script = parseAddress(ckb_address);

    const capacity_per_cell = BigInt("10000000000"); // 100 ckb
    let outputCell: Cell = {
      cell_output: {
        capacity: `0x${capacity_per_cell.toString(16)}`,
        lock: lock,
      },
      data: "0x",
    };
    try {
      txSkeleton = await common.injectCapacity(
        txSkeleton,
        [ckb_address],
        capacity_per_cell
      );
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
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
    const tx_hash: Hash = await this.transactionManager.send_transaction(tx);
    console.log(`transaction ${tx_hash} is now sent...`);
    return tx_hash;
  }

  // split cells evenly
  async sendSplitCells(
    total_capacity: bigint,
    total_pieces: number,
    private_key: string
  ) {
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });
    const ckb_address = generateCkbAddress(private_key);
    const lock: Script = parseAddress(ckb_address);

    const capacity_per_cell = total_capacity / BigInt(total_pieces);
    let outputCell: Cell = {
      cell_output: {
        capacity: `0x${capacity_per_cell.toString(16)}`,
        lock: lock,
      },
      data: "0x",
    };
    let outputCells: Cell[] = [];
    for (let i = 0; i < total_pieces; i++) {
      outputCells.push(outputCell);
    }
    try {
      txSkeleton = await common.injectCapacity(
        txSkeleton,
        [ckb_address],
        capacity_per_cell * BigInt(total_pieces)
      );
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
    txSkeleton = txSkeleton.update("outputs", (outputs) => {
      return outputs.push(...outputCells);
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
    const tx_hash: Hash = await this.transactionManager.send_transaction(tx);
    console.log(`transaction ${tx_hash} is now sent...`);
    return tx_hash;
  }

  async sendScriptDeployTransaction(
    contract_code_hex: HexString,
    private_key: string
  ): Promise<ScriptDeploymentTransactionInfo> {
    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });
    const ckb_address = generateCkbAddress(private_key);
    const lock: Script = parseAddress(ckb_address);

    // "TYPE_ID" in hex
    // pub const TYPE_ID_CODE_HASH: H256 = h256!("0x545950455f4944");
    const type: Script = {
      code_hash:
        "0x00000000000000000000000000000000000000000000000000545950455f4944",
      hash_type: "type",
      args: "0x" + "0".repeat(64), // inputcell+index
    };

    let outputCell: Cell = {
      cell_output: {
        capacity: "0x000000000001",
        lock: lock,
        type: type,
      },
      data: contract_code_hex,
    };

    let capacity: bigint;
    try {
      capacity = minimalCellCapacity(outputCell, { validate: false });
      console.log("capacity needed: ", capacity);
      outputCell.cell_output.capacity = "0x" + capacity.toString(16);
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

    if (!txSkeleton.inputs.first())
      throw new Error("txSkeleton.inputs.first() is undefined.");

    const first_input_cell: Cell = txSkeleton.inputs.first();

    const first_cell_input = {
      since: "0x0",
      previous_output: first_input_cell.out_point!,
    };

    const type_id_args_hex = this.generateTypeIDArgsHash(first_cell_input, 1);

    outputCell.cell_output.type!.args = type_id_args_hex;

    const real_type = outputCell.cell_output.type!;

    const contract_script_hash = utils.computeScriptHash(real_type);

    console.log(`contract_script_hash: ${contract_script_hash}`);

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

    const tx_hash: Hash = await this.transactionManager.send_transaction(tx);
    console.log(`transaction ${tx_hash} is now sent...`);
    const outpoint: OutPoint = {
      tx_hash: tx_hash,
      index: "0x1",
    };
    return { outpoint, script_hash: contract_script_hash };
  }

  async deployLayer1ContractWithTypeId(
    contract_code_hex: HexString,
    private_key: string,
    callback?: (outpoint: OutPoint, script_hash: HexString) => any
  ) {
    callback =
      callback || function (_outpoint: OutPoint, _script_hash: HexString) {};

    let txSkeleton = TransactionSkeleton({
      cellProvider: this.transactionManager,
    });
    const ckb_address = generateCkbAddress(private_key);
    const lock: Script = parseAddress(ckb_address);

    // "TYPE_ID" in hex
    // pub const TYPE_ID_CODE_HASH: H256 = h256!("0x545950455f4944");
    const type: Script = {
      code_hash:
        "0x00000000000000000000000000000000000000000000000000545950455f4944",
      hash_type: "type",
      args: "0x" + "0".repeat(64), // inputcell+index
    };

    let outputCell: Cell = {
      cell_output: {
        capacity: "0x000000000001",
        lock: lock,
        type: type,
      },
      data: contract_code_hex,
    };

    let capacity;
    try {
      capacity = minimalCellCapacity(outputCell, { validate: false });
      console.log("capacity needed: ", capacity);
      outputCell.cell_output.capacity = "0x" + capacity.toString(16);
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

    if (!txSkeleton.inputs.first())
      throw new Error("txSkeleton.inputs.first() is undefined.");

    const first_input_cell: Cell = txSkeleton.inputs.first();

    const first_cell_input = {
      since: "0x0",
      previous_output: first_input_cell.out_point!,
    };

    const type_id_args_hex = this.generateTypeIDArgsHash(first_cell_input, 1);

    outputCell.cell_output.type!.args = type_id_args_hex;

    const real_type = outputCell.cell_output.type!;

    const contract_script_hash = utils.computeScriptHash(real_type);

    console.log(`contract_script_hash: ${contract_script_hash}`);

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

    try {
      const txHash: Hash = await this.ckb_rpc.send_transaction(
        tx,
        "passthrough"
      );
      console.log(`transaction ${txHash} is now sent...`);
      const tx_with_status = await this.waitForCkbTx(txHash);
      console.log(`${txHash} status: ${tx_with_status.tx_status}`);

      const outpoint: OutPoint = {
        tx_hash: txHash,
        index: "0x1",
      };

      callback(outpoint, contract_script_hash);
      return { outpoint, script_hash: contract_script_hash };
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  generateTypeIDArgsHash(
    first_cell_input: any,
    first_output_index: number
  ): HexString {
    let first_input_molecule;
    try {
      first_input_molecule = ckb_core.SerializeCellInput(
        ckb_normalizers.NormalizeCellInput(first_cell_input)
      );
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }

    const hasher = new utils.CKBHasher();

    hasher.update(first_input_molecule);
    hasher.update(toBigUInt64LE(first_output_index));
    return hasher.digestHex();
  }

  async genSudtConfig(outpoint: OutPoint, code_hash: HexString) {
    const sudt = {
      CODE_HASH: code_hash,
      HASH_TYPE: "type",
      TX_HASH: outpoint.tx_hash,
      INDEX: outpoint.index,
      DEP_TYPE: "code",
    };
    const file_path = path.join(__dirname, "../configs/lumos-config.json");
    const file = await fs.readFileSync(file_path);
    let lumos_config = JSON.parse(file.toString("utf-8"));
    lumos_config.SCRIPTS.SUDT = sudt;
    await fs.writeFileSync(file_path, JSON.stringify(lumos_config, null, 2));
    console.log("lumos-config.json has been updated!");
    // console.log('re-init lumos...');
    // await this.reinit_lumos();
  }

  async reinit_lumos() {
    const origin_config = getConfig();

    this.indexer!.stop();
    this.indexer = null;

    const isReInitEnable = true;
    await this.syncLayer1(isReInitEnable);

    const new_config = getConfig();

    const isConfigChanged = !deepCompare(origin_config, new_config);
    console.log(`config reload: is config changed ? ${isConfigChanged}`);

    if (isConfigChanged) {
      const deepDiffMapper: any = new DeepDiffMapper();
      const result = deepDiffMapper.map(origin_config, new_config);
      const diff_parts = await deepDiffMapper.filterDiff(result);
      console.log(`change part is: ${JSON.stringify(diff_parts, null, 2)}`);
    }
  }

  async getSudtContractCodeHex() {
    const contract_file = path.join(__dirname, "../configs/bin/simple_udt");
    console.log(contract_file);
    const complied_code = await fs.readFileSync(contract_file);
    return "0x" + complied_code.toString("hex");
  }

  async getLumosConfigFile() {
    const file_path = path.resolve(__dirname, "../configs/lumos-config.json");
    const data = await fs.readFileSync(file_path);
    const data_json = JSON.parse(data.toString("utf-8"));
    return data_json;
    //return getConfig();
  }
}
