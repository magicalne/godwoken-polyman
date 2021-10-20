import { normalizers, Reader } from "ckb-js-toolkit";
import { core as base_core, core, Script, utils } from "@ckb-lumos/base";
import { scriptToAddress } from "@ckb-lumos/helpers";
import { getConfig } from "@ckb-lumos/config-manager";
import { gwScriptsConfig, rollupTypeHash } from "./config";
import {
  GodwokenUtils,
  RawL2Transaction,
  toBuffer,
} from "@godwoken-polyman/godwoken";
import * as secp256k1 from "secp256k1";
const keccak256 = require("keccak256");

export function generateLockScript(privateKey: any) {
  const privateKeyBuffer = new Reader(privateKey).toArrayBuffer();
  const publicKeyArray = secp256k1.publicKeyCreate(
    new Uint8Array(privateKeyBuffer)
  );
  const publicKeyHash = utils
    .ckbHash(publicKeyArray.buffer)
    .serializeJson()
    .substr(0, 42);
  const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
  const script = {
    code_hash: scriptConfig.CODE_HASH,
    hash_type: scriptConfig.HASH_TYPE,
    args: publicKeyHash,
  };
  return script;
}

export function generateCkbAddress(privateKey: any) {
  const script = generateLockScript(privateKey);
  return scriptToAddress(script);
}

export function generateEthAddress(privkey: any) {
  const privateKeyBuffer = new Reader(privkey).toArrayBuffer();
  const publicKeyArray = secp256k1.publicKeyCreate(
    new Uint8Array(privateKeyBuffer),
    false
  );
  const addr = `0x${keccak256(toBuffer(publicKeyArray.buffer).slice(1))
    .slice(12)
    .toString("hex")}`;
  console.log("EthAddress:", addr);
  return addr;
}

export function calculateLayer2LockScriptHash(layer2LockArgs: string) {
  const script = {
    code_hash: gwScriptsConfig.eth_account_lock.code_hash,
    hash_type: gwScriptsConfig.eth_account_lock.hash_type,
    args: rollupTypeHash + layer2LockArgs.slice(2),
  };
  return utils
    .ckbHash(core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

export function serializeScript(script: Script) {
  return utils
    .ckbHash(core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

export function accountScriptHash(privkey: any) {
  const script: Script = {
    code_hash: gwScriptsConfig.eth_account_lock.code_hash,
    hash_type: gwScriptsConfig.eth_account_lock.hash_type as "data" | "type",
    args: rollupTypeHash + generateEthAddress(privkey).slice(2),
  };
  return utils
    .ckbHash(base_core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

export function _signMessage(message: string, privkey: string) {
  const signObject = secp256k1.ecdsaSign(
    new Uint8Array(new Reader(message).toArrayBuffer()),
    new Uint8Array(new Reader(privkey).toArrayBuffer())
  );
  const signatureBuffer = new ArrayBuffer(65);
  const signatureArray = new Uint8Array(signatureBuffer);
  signatureArray.set(signObject.signature, 0);
  signatureArray.set([signObject.recid], 64);
  return new Reader(signatureBuffer).serializeJson();
}

export function _generateTransactionMessageToSign(
  raw_l2tx: RawL2Transaction,
  rollup_type_hash: string,
  sender_script_hash: string,
  receiver_script_hash: string,
  add_prefix?: boolean
) {
  const godwoken_utils = new GodwokenUtils(rollup_type_hash);
  return godwoken_utils.generateTransactionMessageToSign(
    raw_l2tx,
    sender_script_hash,
    receiver_script_hash,
    add_prefix
  );
}

export function _createAccountRawL2Transaction(
  from_id: number,
  nonce: number,
  script_code_hash: string,
  script_args: string
) {
  const script: Script = {
    code_hash: script_code_hash,
    hash_type: "type",
    args: rollupTypeHash + script_args.slice(2),
  };
  console.log(`creator args: ${JSON.stringify(script, null, 2)}`);
  return GodwokenUtils.createAccountRawL2Transaction(from_id, nonce, script);
}
