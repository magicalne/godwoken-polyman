import { Reader } from "ckb-js-toolkit";
import { SerializeDepositLockArgs } from "@godwoken-polyman/godwoken/schemas/godwoken";
import { DeploymentConfig } from "../base";
import { deploymentConfig } from "../utils/deployment_config";
import { Script, HexString, Hash, PackedSince, utils } from "@ckb-lumos/base";
import { NormalizeDepositLockArgs } from "@godwoken-polyman/godwoken/normalizer";
import godwokenConfig from "../../configs/godwoken-config.json";

export interface DepositLockArgs {
  owner_lock_hash: Hash;
  layer2_lock: Script;
  cancel_timeout: PackedSince;
}

export function serializeArgs(args: DepositLockArgs): HexString {
  const rollup_type_hash: Hash = getRollupTypeHash();
  console.log(`rollup_type_hash: ${rollup_type_hash}`);
  console.log(`DepositLockArgs: ${JSON.stringify(args, null, 2)}`);
  const serializedDepositLockArgs: ArrayBuffer = SerializeDepositLockArgs(
    NormalizeDepositLockArgs(args)
  );

  const depositLockArgsStr: HexString = new Reader(
    serializedDepositLockArgs
  ).serializeJson();

  return rollup_type_hash + depositLockArgsStr.slice(2);
}

export function generateDepositLock(
  config: DeploymentConfig,
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
  const rollup_type_hash = getRollupTypeHash();
  const depositLockArgs: DepositLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: {
      code_hash: deploymentConfig.eth_account_lock.code_hash,
      hash_type: deploymentConfig.eth_account_lock.hash_type as "data" | "type",
      args: rollup_type_hash + layer2_lock_args.slice(2),
    },
    cancel_timeout: cancelTimeout, // relative timestamp, 2 days
  };
  return depositLockArgs;
}

export function getRollupTypeHash(): HexString {
  const rollupTypeScript: Script = godwokenConfig.chain
    .rollup_type_script as Script;
  const hash: HexString = utils.computeScriptHash(rollupTypeScript);
  console.log("rollupTypeHash:", hash);
  return hash;
}

export function getL2SudtScriptHash(l1_sudt_script: Script): HexString {
  const script_hash = utils.computeScriptHash(l1_sudt_script);
  const sudt_script = {
    code_hash: deploymentConfig.l2_sudt_validator.code_hash,
    hash_type: deploymentConfig.l2_sudt_validator.hash_type as "data" | "type",
    args: getRollupTypeHash() + script_hash.slice(2),
  };
  console.log(`sudt_script: ${JSON.stringify(sudt_script)}`);
  return utils.computeScriptHash(sudt_script);
}
