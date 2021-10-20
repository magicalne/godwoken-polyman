import { start as startApiServer } from "./main-server";
import { start as startUI } from "./ui-server";
import { envConfig } from "./base/config";

const start = async () => {
  await startApiServer();
  envConfig.mode === "testnet" || startUI();
};

start();
