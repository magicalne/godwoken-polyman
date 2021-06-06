import path from "path";
import { Api } from "./api";
import serverConfig from "../configs/polyman-config.json";
import { asyncSleep } from "./util";
import { initializeConfig, getConfig } from "@ckb-lumos/config-manager";

const _indexer_path = path.resolve(__dirname, "../db/ckb-indexer-data-sudt");

const ckb_rpc = process.env.MODE === "docker-compose" ? serverConfig.components.ckb.rpc[0] : serverConfig.components.ckb.rpc[1];
const godwoken_rpc = process.env.MODE === "docker-compose" ? serverConfig.components.godwoken.rpc[0] : serverConfig.components.ckb.rpc[1] ;
const user_private_key = serverConfig.user_private_key;

console.log("start..");
const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
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

