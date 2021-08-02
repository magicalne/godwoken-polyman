import PolymanConfig from "../configs/polyman-config.json";

const DefaultIndexerPath =
  process.env.INDEXER_DB || PolymanConfig.store.default_indexer_db_path;

export {
  PolymanConfig,
  DefaultIndexerPath,
};
