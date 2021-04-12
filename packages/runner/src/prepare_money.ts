import path from "path";
import { Api } from "./api";
import serverConfig from "../configs/server.json";
import gpConfig from "../configs/config.json";
import { asyncSleep } from "./util";

const _indexer_path = path.resolve(__dirname, "../temp-db/ckb-indexer-data");

const ckb_rpc = gpConfig.ckb.rpc[0];
const godwoken_rpc = gpConfig.godwoken.rpc[0];
const miner_private_key = serverConfig.miner_private_key;
const miner_ckb_devnet_addr = serverConfig.miner_ckb_devnet_addr;
const user_ckb_devnet_addr = serverConfig.user_ckb_devnet_addr;
const user_account_init_amount = BigInt(serverConfig.user_account_init_amount);

console.log("start..");
const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
api.syncLayer1();

var retry = 0;
const intervals = 5000; // 5 seconds

export const run = async (maxRetryLimit: number) => {
  try {
    const isMoneyReady = await api.checkCkbBalance(user_ckb_devnet_addr, user_account_init_amount);
    if(isMoneyReady){
      console.log(`money already prepared.`);
      console.log(`finished~`);
      process.exit(0); 
    }else{
      retry++;
      await api.giveUserLayer1AccountSomeMoney(miner_ckb_devnet_addr, miner_private_key, user_ckb_devnet_addr, user_account_init_amount);
      console.log(`prepared money.`);
      console.log(`finished~`);
      process.exit(0);
    }
  } catch (e) {
    console.error(e);
    if(retry < maxRetryLimit){
      asyncSleep(intervals);
      console.log(`retry...${retry}`);
      run(maxRetryLimit);
    }else{
      console.error(`failed to prepare money.`);
      process.exit(1);
    }
  }
};

run(20);

