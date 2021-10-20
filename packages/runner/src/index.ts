import { start as startApiServer } from "./server";
import { start as startUI } from "./ui";
import { envConfig } from "./base/config";

const start = async () => {
  await startApiServer();
  envConfig.mode === "testnet" || startUI();
};

start();
