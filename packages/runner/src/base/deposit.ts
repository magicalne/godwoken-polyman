import { Reader } from "ckb-js-toolkit";
import { SerializeDepositLockArgs } from "@godwoken-polyman/godwoken/schemas/godwoken";
import { GwScriptsConfig } from "./types/conf";
import { gwScriptsConfig } from "./config";
import { Script, HexString, Hash, PackedSince, utils } from "@ckb-lumos/base";
import { NormalizeDepositLockArgs } from "@godwoken-polyman/godwoken/lib/normalizer";
import { rollupTypeHash } from "./config";

export interface DepositLockArgs {
  owner_lock_hash: Hash;
  layer2_lock: Script;
  cancel_timeout: PackedSince;
}

export function serializeArgs(args: DepositLockArgs): HexString {
  console.log(`rollup_type_hash: ${rollupTypeHash}`);
  console.log(`DepositLockArgs: ${JSON.stringify(args, null, 2)}`);
  const serializedDepositLockArgs: ArrayBuffer = SerializeDepositLockArgs(
    NormalizeDepositLockArgs(args)
  );

  const depositLockArgsStr: HexString = new Reader(
    serializedDepositLockArgs
  ).serializeJson();

  return rollupTypeHash + depositLockArgsStr.slice(2);
}

export function generateDepositLock(
  config: GwScriptsConfig,
  args: HexString
): Script {
  return {
    code_hash: config.deposit_lock.code_hash,
    hash_type: config.deposit_lock.hash_type,
    args: args,
  };
}

export function getDepositLockArgs(
  ownerLockHash: Hash,
  layer2_lock_args: HexString,
  cancelTimeout: PackedSince = "0xc00000000002a300"
): DepositLockArgs {
  const depositLockArgs: DepositLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: {
      code_hash: gwScriptsConfig.eth_account_lock.code_hash,
      hash_type: gwScriptsConfig.eth_account_lock.hash_type as "data" | "type",
      args: rollupTypeHash + layer2_lock_args.slice(2),
    },
    cancel_timeout: cancelTimeout, // relative timestamp, 2 days
  };
  return depositLockArgs;
}

export function getL2SudtScriptHash(l1_sudt_script: Script): HexString {
  const script_hash = utils.computeScriptHash(l1_sudt_script);
  const sudt_script = {
    code_hash: gwScriptsConfig.l2_sudt_validator.code_hash,
    hash_type: gwScriptsConfig.l2_sudt_validator.hash_type as "data" | "type",
    args: rollupTypeHash + script_hash.slice(2),
  };
  console.log(`sudt_script: ${JSON.stringify(sudt_script)}`);
  return utils.computeScriptHash(sudt_script);
}
