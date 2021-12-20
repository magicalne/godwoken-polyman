import { FeeTest, outputTestReport } from "./test-tool";
import path from "path";
import { urls, indexerDbPath, polymanConfig } from "./base/config";
import { Api } from "./api";

let INDEXER_DB_PATH = path.resolve(
  indexerDbPath,
  "./api-server/ckb-indexer-data/testcase"
);
const api = new Api(
  urls.ckb_rpc,
  urls.godwoken_rpc,
  urls.web3_rpc,
  INDEXER_DB_PATH
);
api.syncLayer1();

const fee = async () => {
  const test = new FeeTest(api, polymanConfig.addresses.user_private_key);
  try {
    await test.prepareTestAccounts(30);
    const results = await test.run();
    await outputTestReport(results);
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(123);
  }
};

const run = async () => {
  await fee();
};

run();
