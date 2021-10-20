import { polymanConfig, urls, indexerDbPath } from "./base/config";
import express from "express";
import cors from "cors";
import timeout from "connect-timeout";
import path from "path";
import { Api } from "./api";
import { SetupService } from "./services/setup";
import { setUpRouters } from "./base/httpServer";

const STORE_PATH_ROOT = path.resolve(indexerDbPath, "./call-polyman");
const indexer_db_path = path.resolve(STORE_PATH_ROOT, "./indexer-db");
const api = new Api(
  urls.ckb_rpc,
  urls.godwoken_rpc,
  urls.web3_rpc,
  indexer_db_path
);
api.syncLayer1();

export const app = express();
const corsOptions = {
  origin: ["*"],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
};
app.use(cors(corsOptions));
app.use(timeout("600s")); // keep alive for a long time
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));

const service = new SetupService(api);
setUpRouters(app, service, SetupService);

export function start() {
  app.listen(polymanConfig.http_server_options.setup_port, () => {
    console.log(
      `${service.name} Server started at http://localhost:${polymanConfig.http_server_options.setup_port}`
    );
  });
}

start();
