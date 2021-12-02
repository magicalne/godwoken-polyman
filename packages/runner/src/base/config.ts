import { env } from "process";
import path from "path";
import { ConfigIndex, GwScriptsConfig } from "./types/conf";
import PolymanConfig from "../../configs/polyman-config.json";
import { Script, CellDep, HexString, utils } from "@ckb-lumos/base";
import scripts from "../../configs/scripts-deploy-result.json";
import GodwokenConfig from "../../configs/godwoken-config.json";

export const gwScriptsConfig: GwScriptsConfig = {
  custodian_lock: buildScriptFromCodeHash(
    scripts.custodian_lock.script_type_hash
  ),
  deposit_lock: buildScriptFromCodeHash(scripts.deposit_lock.script_type_hash),
  withdrawal_lock: buildScriptFromCodeHash(
    scripts.withdrawal_lock.script_type_hash
  ),
  challenge_lock: buildScriptFromCodeHash(
    scripts.challenge_lock.script_type_hash
  ),
  stake_lock: buildScriptFromCodeHash(scripts.stake_lock.script_type_hash),
  state_validator: buildScriptFromCodeHash(
    scripts.state_validator.script_type_hash
  ),
  meta_contract_validator: buildScriptFromCodeHash(
    scripts.meta_contract_validator.script_type_hash
  ),
  l2_sudt_validator: buildScriptFromCodeHash(
    scripts.l2_sudt_validator.script_type_hash
  ),
  eth_account_lock: buildScriptFromCodeHash(
    scripts.eth_account_lock.script_type_hash
  ),
  polyjuice_validator: buildScriptFromCodeHash(
    scripts.polyjuice_validator.script_type_hash
  ),
  state_validator_lock: buildScriptFromCodeHash(
    scripts.state_validator_lock.script_type_hash
  ),
  poa_state: buildScriptFromCodeHash(scripts.poa_state.script_type_hash),

  deposit_lock_dep: scripts.deposit_lock.cell_dep as CellDep,
  custodian_lock_dep: scripts.custodian_lock.cell_dep as CellDep,
  withdrawal_lock_dep: scripts.withdrawal_lock.cell_dep as CellDep,
  challenge_lock_dep: scripts.challenge_lock.cell_dep as CellDep,
  stake_lock_dep: scripts.stake_lock.cell_dep as CellDep,
  state_validator_dep: scripts.state_validator.cell_dep as CellDep,
  meta_contract_validator_dep: scripts.meta_contract_validator
    .cell_dep as CellDep,
  l2_sudt_validator_dep: scripts.l2_sudt_validator.cell_dep as CellDep,
  eth_account_lock_dep: scripts.eth_account_lock.cell_dep as CellDep,
  polyjuice_validator_dep: scripts.polyjuice_validator.cell_dep as CellDep,
  state_validator_lock_dep: scripts.state_validator.cell_dep as CellDep,
  poa_state_dep: scripts.poa_state.cell_dep as CellDep,
};

export const rollupTypeHash = getRollupTypeHash();

export const polymanConfig = PolymanConfig;

export const godwokenConfig = GodwokenConfig;

export const envConfig = {
  lumos: getRequired("LUMOS_CONFIG_FILE"),
  mode: getOptional("MODE"),
  indexer_db: getOptional("INDEXER_DB"),
};

export const cfgIdx = getConfigIndex();

export const filePaths = {
  godwoken_config: path.resolve(
    __dirname,
    "../../configs/godwoken-config.json"
  ),
  scripts_deploy_result: path.resolve(
    __dirname,
    "../../configs/scripts-deploy-result.json"
  ),
  lumos_config: path.resolve(__dirname, "../../configs/lumos-config.json"),
  polyman_config: path.resolve(__dirname, "../../configs/polyman-config.json"),
};

export const urls = {
  ckb_rpc: polymanConfig.components.ckb.rpc[cfgIdx],
  ckb_indexer_rpc: polymanConfig.components.indexer.rpc[cfgIdx],
  godwoken_rpc: polymanConfig.components.godwoken.rpc[cfgIdx],
  web3_rpc: polymanConfig.components.web3.rpc[cfgIdx],
};

export const indexerDbPath =
  envConfig.indexer_db || polymanConfig.store.default_indexer_db_path;

//======== helper functions ==============
function getRequired(name: string): string {
  const value = env[name];
  if (value == null) {
    throw new Error(`no env ${name} provided`);
  }

  return value;
}

function getOptional(name: string): string | undefined {
  return env[name];
}

function getConfigIndex() {
  let cfgIdx;
  switch (envConfig.mode) {
    case "testnet":
      cfgIdx = ConfigIndex.testnet;
      break;
    case "docker-compose":
      cfgIdx = ConfigIndex.docker_compose;
      break;
    case "normal":
      cfgIdx = ConfigIndex.normal;
      break;
    default:
      cfgIdx = ConfigIndex.normal;
  }
  return cfgIdx;
}

function buildScriptFromCodeHash(codeHash: string): Script {
  return {
    code_hash: codeHash,
    hash_type: "type",
    args: "0x",
  };
}

function getRollupTypeHash(): HexString {
  const rollupTypeScript: Script = GodwokenConfig.chain
    .rollup_type_script as Script;
  const hash: HexString = utils.computeScriptHash(rollupTypeScript);
  return hash;
}
