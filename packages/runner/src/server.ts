import { Api } from "./api";
import path from "path";
import express from "express";
import cors from "cors";
import timeout from "connect-timeout";
import { polymanConfig, urls, indexerDbPath } from "./base/config";
import { getRollupTypeHash } from "../js/transactions/deposit";
import { main as MainService } from "./services/main";
import { setUpRouters } from "./base/httpServer";

let INDEXER_DB_PATH = path.resolve(
  indexerDbPath,
  "./api-server/ckb-indexer-data"
);
const api = new Api(
  urls.ckb_rpc,
  urls.godwoken_rpc,
  urls.web3_rpc,
  INDEXER_DB_PATH
);
api.syncLayer1();

export const app = express();
const corsOptions = {
  origin: polymanConfig.http_server_options.cros_list,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
};
app.use(cors(corsOptions));
app.use("/static", express.static(path.join(__dirname, "../../src/resource")));
app.use(timeout("300s")); // keep alive for a long time
app.use(express.urlencoded({ extended: false, limit: "1mb" })); // for uploading very large contract code
app.use(express.json({ limit: "1mb" }));

const service = new MainService(api);
setUpRouters(app, service, MainService);

export async function start() {
  await api.waitForGodwokenStart();

  // start a polyjuice chain
  try {
    await api.syncToTip();
    const creatorId = await api.findCreatorAccountId(
      polymanConfig.default_quantity.sudt_id_str
    );
    if (creatorId === null) {
      const from_id = await api.deposit(
        polymanConfig.addresses.user_private_key,
        undefined,
        polymanConfig.default_quantity.deposit_amount
      );
      console.log(`create deposit account.${from_id}`);
      const rollup_type_hash = getRollupTypeHash();
      const creator_account_id = await api.createCreatorAccount(
        from_id,
        polymanConfig.default_quantity.sudt_id_str,
        rollup_type_hash,
        polymanConfig.addresses.user_private_key
      );
      console.log(`create creator account =>`, creator_account_id);
      console.log(`init polyjuice chain.`);
    } else {
      console.log(
        `polyjuice chain(creatorId: ${creatorId}) already exits, skip createCreatorAccount.`
      );
    }
  } catch (e) {
    throw new Error(e);
  }

  // start api server
  app.listen(polymanConfig.http_server_options.main_port, () => {
    console.log(
      `${service.name} Server started at http://localhost:${polymanConfig.http_server_options.main_port}`
    );
  });
}
