import { env } from "process";
import path from "path";
import { ConfigIndex } from "./types/conf";
import PolymanConfig from "../../configs/polyman-config.json";

export const polymanConfig = PolymanConfig;

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
  godwoken_rpc: polymanConfig.components.godwoken.rpc[cfgIdx],
  web3_rpc: polymanConfig.components.web3.rpc[cfgIdx],
};

export const indexerDbPath =
  envConfig.indexer_db || polymanConfig.store.default_indexer_db_path;

// helper functions
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
