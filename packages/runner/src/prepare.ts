import PolymanConfig from '../configs/polyman-config.json';
import express from 'express';
import cors from 'cors';
import timeout from "connect-timeout";
import { asyncSleep, generateGodwokenConfig } from './util';
import path from "path";
import { Api } from "./api";

const ckb_rpc = process.env.MODE === "docker-compose" ? PolymanConfig.components.ckb.rpc[0] : PolymanConfig.components.ckb.rpc[1];
const godwoken_rpc = process.env.MODE === "docker-compose" ? PolymanConfig.components.godwoken.rpc[0] : PolymanConfig.components.ckb.rpc[1] ;
const miner_private_key = PolymanConfig.miner_private_key;
const miner_ckb_devnet_addr = PolymanConfig.miner_ckb_devnet_addr;
const user_ckb_devnet_addr = PolymanConfig.user_ckb_devnet_addr;
const user_account_init_amount = BigInt(PolymanConfig.user_account_init_amount);
const user_private_key = PolymanConfig.user_private_key;

export const app = express();
const corsOptions = {
    origin: ["*"],
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
}
app.use(cors(corsOptions));
app.use(timeout('600s')); // keep alive for a long time
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({limit: '1mb'}));


app.get('/prepare_money', async function (req, res) {
    console.log("start prepare money..");
    const _indexer_path = path.resolve(__dirname, "../db/ckb-indexer-data-prepare-money");
    const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
    api.syncLayer1();

    var retry = 0;
    const run_prepare_money = async (maxRetryLimit: number, intervals=5000) => {
        try {
          const isMoneyReady = await api.checkCkbBalance(user_ckb_devnet_addr, user_account_init_amount);
          if(isMoneyReady){
            console.log(`money already prepared.`);
            console.log(`finished~`);
            res.send({status: 'ok', data: 'money already prepared. finished.'});
          }else{
            retry++;
            await api.giveUserLayer1AccountSomeMoney(miner_ckb_devnet_addr, miner_private_key, user_ckb_devnet_addr, user_account_init_amount);
            console.log(`prepared money.`);
            console.log(`finished~`);
            res.send({status: 'ok', data: 'prepared money. finished~'});
          }
        } catch (e) {
          console.error(e);
          if(retry < maxRetryLimit){
            await asyncSleep(intervals);
            console.log(`retry...${retry}th times`);
            run_prepare_money(maxRetryLimit);
          }else{
            console.error(`failed to prepare money.`);
            res.send({status: 'failed', data: 'failed to prepare money.'});
          }
        }
    };

    // retry 20 times max.
    await run_prepare_money(20);
});

app.get('/prepare_sudt_scripts', function (req, res) {
  console.log("start prepare money..");
  const _indexer_path = path.resolve(__dirname, "../db/ckb-indexer-data-prepare-sudt-scripts");
  const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
  api.syncLayer1();

  var retry = 0;
  const run_prepare_sudt_scripts = async (maxRetryLimit: number, intervals=5000) => {
    try {
      const isSudtScriptAlreadyExits = await api.checkIfL1SudtScriptExits(ckb_rpc);
      if(isSudtScriptAlreadyExits){
        console.log(`sudt script already prepared.`);
        console.log(`finished~`);
        res.send({status: 'ok', data: 'sudt script already prepared. finished~'});
      }else{
        retry++;
        await api.deployLayer1Sudt(user_private_key);
        console.log(`prepared sudt scripts.`);
        console.log(`finished~`);
        res.send({status: 'ok', data: 'prepared sudt scripts. finished~'});
      }
    } catch (e) {
      console.error(e);
      if(retry < maxRetryLimit){
        await asyncSleep(intervals);
        console.log(`retry...${retry}th times`);
        run_prepare_sudt_scripts(maxRetryLimit);
      }else{
        console.error(`failed to prepare sudt script for lumos.`);
        res.send({status: 'failed', data: 'failed to prepare sudt script for lumos.'});
      }
    }
  };

  // retry 20 times max.
  run_prepare_sudt_scripts(20);
});

app.get('/gen_config', async function (req, res) {
  console.log("start gen config..");
  try {
    await generateGodwokenConfig('../configs/config.toml', '../configs/godwoken-config.json');
    res.send({status: 'ok', data: 'generated new godwoken config for polyman.'});
  } catch (error) {
    res.send({status: 'failed', error: error});
  }
});

export function start () {
   app.listen(PolymanConfig.prepare_service_port, () => {
       console.log(`preparetion server started at http://localhost:${PolymanConfig.prepare_service_port}`);
   });
}
