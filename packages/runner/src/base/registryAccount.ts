import { HexString, Script } from "@ckb-lumos/base";
import { GodwokenUtils } from "@godwoken-polyman/godwoken";

export type RollupTypeHash = HexString;
export type RegistryArgs = RollupTypeHash;

export function generateRegisterAccountScript(
  eth_addr_reg_validator_code_hash: HexString,
  rollupTypeHash: RollupTypeHash
): Script {
  return {
    code_hash: eth_addr_reg_validator_code_hash,
    hash_type: "type",
    args: rollupTypeHash,
  };
}

export function createRegisterAccountRawL2Transaction(
  fromId: number,
  nonce: number,
  script: Script
) {
  return GodwokenUtils.createAccountRawL2Transaction(fromId, nonce, script);
}
