import path from "path";
import { Api } from "./api";
import { PolymanConfig, DefaultIndexerPath } from "./getPolymanConfig";
import { asyncSleep } from "./util";
const INDEXER_DB_PATH = path.resolve(DefaultIndexerPath, "./prepare_money/ckb-indexer-data");

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
const godwoken_rpc = PolymanConfig.components.ckb.rpc[cfgIdx] ;
const miner_private_key = PolymanConfig.miner_private_key;
const miner_ckb_devnet_addr = PolymanConfig.miner_ckb_devnet_addr;
const user_ckb_devnet_addr = PolymanConfig.user_ckb_devnet_addr;
const user_account_init_amount = BigInt(PolymanConfig.user_account_init_amount);

console.log("start..");
const api = new Api(ckb_rpc, godwoken_rpc, INDEXER_DB_PATH);
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
      await asyncSleep(intervals);
      console.log(`retry...${retry}th times`);
      run(maxRetryLimit);
    }else{
      console.error(`failed to prepare money.`);
      process.exit(1);
    }
  }
};

run(20);

