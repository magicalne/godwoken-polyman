import { RPC } from "ckb-js-toolkit";
import {
  CellDep,
  HexString,
  HexNumber,
  Hash,
  Indexer,
  Script,
} from "@ckb-lumos/base";
import {
  generateDepositionLock,
  DepositionLockArgs,
  getDepositionLockArgs,
  serializeArgs,
} from "../js/transactions/deposition";
import Config from "../configs/config.json";
import { deploymentConfig } from "../js/utils/deployment_config";
import { normalizers } from "ckb-js-toolkit";
import base from "@ckb-lumos/base";
import { key } from "@ckb-lumos/hd";
import crypto from "crypto";
import keccak256 from "keccak256";
import { getConfig } from "@ckb-lumos/config-manager";
import { generateAddress } from "@ckb-lumos/helpers";
import TOML from '@iarna/toml';
import fs from 'fs';
import path from 'path';
import { getRollupTypeHash } from "../js/transactions/deposition";

export function asyncSleep(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitForBlockSync(
  indexer: Indexer,
  rpc: RPC,
  blockHash?: Hash,
  blockNumber?: bigint
) {
  if (!blockNumber) {
    const header = await rpc.get_header(blockHash);
    blockNumber = BigInt(header.number);
  }
  while (true) {
    await indexer.waitForSync();
    const tip = await indexer.tip();
    if (tip) {
      const indexedNumber = BigInt(tip.block_number);
      if (indexedNumber >= blockNumber) {
        // TODO: do we need to handle forks?
        break;
      }
    }
    await asyncSleep(2000);
  }
}

export function caculateLayer2LockScriptHash(layer2LockArgs: string) {
  const rollup_type_hash = getRollupTypeHash();
  const script = {
    code_hash: deploymentConfig.eth_account_lock.code_hash,
    hash_type: deploymentConfig.eth_account_lock.hash_type,
    args: rollup_type_hash + layer2LockArgs.slice(2),
  };
  return base.utils
    .ckbHash(base.core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

export function serializeScript(script: Script) {
  return base.utils
    .ckbHash(base.core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

export function privateKeyToCkbAddress(privateKey: HexString): string {
  const publicKey = key.privateToPublic(privateKey);
  const publicKeyHash = key.publicKeyToBlake160(publicKey);
  const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
  const script = {
    code_hash: scriptConfig.CODE_HASH,
    hash_type: scriptConfig.HASH_TYPE,
    args: publicKeyHash,
  };
  const address = generateAddress(script);
  return address;
}

export function privateKeyToEthAddress(privateKey: HexString) {
  const ecdh = crypto.createECDH(`secp256k1`);
  ecdh.generateKeys();
  ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
  const publicKey: string = "0x" + ecdh.getPublicKey("hex", "uncompressed");
  const ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return ethAddress;
}

export async function generateGodwokenConfig(_input_file: string, _output_file: string) {
  const toml_path: string = path.resolve(__dirname, _input_file);
  const toml_file_str = await fs.readFileSync(toml_path).toString();
  const toml_file_obj = TOML.parse(toml_file_str);
  const json_path = path.resolve(__dirname, _output_file);
  await fs.writeFileSync(json_path, JSON.stringify(toml_file_obj, null, 2));
  console.log(`create godwoken_config.json file in ${json_path}. done.`);
}

export function toBigUInt64LE(num:number | bigint) {
  const bnum = BigInt(num);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(bnum);
  return `0x${buf.toString("hex")}`;
}