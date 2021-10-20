import { Api } from "./api";
import path from "path";
import express from "express";
import cors from "cors";
import timeout from "connect-timeout";
import { PolymanConfig, DefaultIndexerPath } from "./getPolymanConfig";
import { getRollupTypeHash } from "../js/transactions/deposit";
import { main as MainService } from "./services/main";
import { getMethodNames, setUpRouters } from "./base";

let INDEXER_DB_PATH = path.resolve(
  DefaultIndexerPath,
  "./api-server/ckb-indexer-data"
);
let cfgIdx = 2;
switch (process.env.MODE) {
  case "docker-compose":
    cfgIdx = 1;
    break;
  case "testnet":
    cfgIdx = 0;
    INDEXER_DB_PATH = path.resolve(__dirname, "../db/ckb-indexer-testnet");
    break;
  default:
    cfgIdx = 2;
}

const ckb_rpc = PolymanConfig.components.ckb.rpc[cfgIdx];
const godwoken_rpc = PolymanConfig.components.godwoken.rpc[cfgIdx];
const godwoken_web3_rpc_url =
  PolymanConfig.components.godwoken.web3_rpc[cfgIdx];
const sudt_id_str = PolymanConfig.default_sudt_id_str;
const default_deposit_amount = PolymanConfig.default_amount;
const user_private_key = PolymanConfig.user_private_key;

const api = new Api(
  ckb_rpc,
  godwoken_rpc,
  INDEXER_DB_PATH,
  godwoken_web3_rpc_url
);
api.syncLayer1();

export const app = express();
const corsOptions = {
  origin: PolymanConfig.cros_server_list,
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
    const creatorId = await api.findCreatorAccountId(sudt_id_str);
    if (creatorId === null) {
      const from_id = await api.deposit(
        user_private_key,
        undefined,
        default_deposit_amount
      );
      console.log(`create deposit account.${from_id}`);
      const rollup_type_hash = getRollupTypeHash();
      const creator_account_id = await api.createCreatorAccount(
        from_id,
        sudt_id_str,
        rollup_type_hash,
        user_private_key
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
  app.listen(PolymanConfig.server_port, () => {
    console.log(
      `api server started at http://localhost:${PolymanConfig.server_port}`
    );
  });
}
