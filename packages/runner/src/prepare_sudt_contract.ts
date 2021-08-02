import path from "path";
import { Api } from "./api";
import PolymanConfig from "../configs/polyman-config.json";
import { asyncSleep } from "./util";

const INDEXER_DB_PATH = path.resolve(PolymanConfig.store.default_indexer_db_path, "./sudt/ckb-indexer-data");

let cfgIdx = 2;
switch (process.env.MODE) {
  case "docker-compose":
    cfgIdx = 1;
    break;
  case "testnet":
    cfgIdx = 0;
    break;
  default:
    cfgIdx = 2;
}

const ckb_rpc = PolymanConfig.components.ckb.rpc[cfgIdx];
const godwoken_rpc = PolymanConfig.components.godwoken.rpc[cfgIdx];
const user_private_key = PolymanConfig.user_private_key;

console.log("start..");
const api = new Api(ckb_rpc, godwoken_rpc, INDEXER_DB_PATH);
api.syncLayer1();

var retry = 0;
const intervals = 5000; // 5 seconds

export const run = async (maxRetryLimit: number) => {
  try {
    const isSudtScriptAlreadyExits = await api.checkIfL1SudtScriptExits(ckb_rpc);
    if(isSudtScriptAlreadyExits){
      console.log(`sudt script already prepared.`);
      console.log(`finished~`);
      process.exit(0); 
    }else{
      retry++;
      await api.deployLayer1Sudt(user_private_key);
      console.log(`prepared sudt scripts.`);
      console.log(`finished~`);
      process.exit(0);
    }
  } catch (e) {
    console.error(e);
    if(retry < maxRetryLimit){
      await asyncSleep(intervals);
      console.log(`retry...${retry}th times`);
      run(maxRetryLimit);
    }else{
      console.error(`failed to prepare sudt script for lumos.`);
      process.exit(1);
    }
  }
};

run(20);

