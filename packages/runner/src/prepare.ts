import { PolymanConfig, DefaultIndexerPath } from "./getPolymanConfig";
import express from 'express';
import cors from 'cors';
import timeout from "connect-timeout";
import { asyncSleep, generateGodwokenConfig, getDeployScriptsInfo, readScriptCodeHashFromFile } from './util';
import path from "path";
import { Api } from "./api";
import { execSync } from "child_process";
import { HexString } from "@ckb-lumos/base";

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
const miner_private_key = PolymanConfig.miner_private_key;
const miner_ckb_devnet_addr = PolymanConfig.miner_ckb_devnet_addr;
const user_ckb_devnet_addr = PolymanConfig.user_ckb_devnet_addr;
const user_account_init_amount = BigInt(PolymanConfig.user_account_init_amount);
const user_private_key = PolymanConfig.user_private_key;
const INDEXER_ROOT_DB_PATH = path.resolve(DefaultIndexerPath, "./call-polyman");

const api = new Api(ckb_rpc, godwoken_rpc, INDEXER_ROOT_DB_PATH);
api.syncLayer1();

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

app.get('/ping', async function (req, res) {
    res.send({status:'ok', data:'pong'});
})

app.get('/prepare_money', async function (req, res) {
    console.log("start prepare money..");
   // const _indexer_path = path.resolve(__dirname, `${INDEXER_ROOT_DB_PATH}/ckb-indexer-data-prepare-money`);
   // const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
   // api.syncLayer1();

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

app.get('/prepare_sudt_scripts', async function (req, res) {
  console.log("start prepare sudt_scripts..");
//  const _indexer_path = path.resolve(__dirname, `${INDEXER_ROOT_DB_PATH}/ckb-indexer-data-prepare-sudt-scripts`);
//  const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
//  api.syncLayer1();

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
  await run_prepare_sudt_scripts(20);
});

app.get('/gen_config', async function (req, res) {
  let stdout1 = await execSync('cp /code/workspace/deploy/scripts-deploy-result.json ./configs/scripts-deploy-result.json');
  let stdout2 = await execSync('cp /code/workspace/config.toml ./configs/config.toml');

  console.log(stdout1, stdout2);

  console.log("start gen config..");
  try {
    await generateGodwokenConfig('../configs/config.toml', '../configs/godwoken-config.json');
    res.send({status: 'ok', data: 'generated new godwoken config for polyman.'});
  } catch (error) {
    res.send({status: 'failed', error: error});
  }
});

app.get('/get_lumos_config', function(req, res){
  try {
  //  const _indexer_path = path.resolve(__dirname, `${INDEXER_ROOT_DB_PATH}/ckb-indexer-data-get-lumos-config`);
  //  const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
    const config = api.getLumosConfigFile();
    res.send({status: 'ok', data: config }); 
  } catch (error) {
    res.send({status: 'failed', error: error}); 
  }
});

app.get('/get_lumos_script_info', function(req, res){
  try {
    const script_name: string = req.query.script_name + '';
    const key = req.query.key + '';

  //  const _indexer_path = path.resolve(__dirname, `${INDEXER_ROOT_DB_PATH}/ckb-indexer-data-get-lumos-config`);
  //  const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
    const config = api.getLumosConfigFile();
    res.send({status: 'ok', data: config.SCRIPTS[script_name][key] }); 
  } catch (error) {
    res.send({status: 'failed', error: error}); 
  }
});

app.get('/deploy_godwoken_scripts', async function(req, res){
  try {
    const scripts_deploy_file_path: string = req.query.scripts_file_path + '';

  //  const _indexer_path = path.resolve(__dirname, `${INDEXER_ROOT_DB_PATH}/ckb-indexer-data-deploy-scripts`);
  //  const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
  //  api.syncLayer1();

    let scripts_info = await getDeployScriptsInfo(scripts_deploy_file_path);
    
    let script_names = Object.keys(scripts_info);
    const total_scripts_number = script_names.length;
    
    let deploy_counter = 0;
    console.time("deploy godwoken scripts");

    let retry = 0;
    const run_deploy_script = async (script_name: string, script_path: string, maxRetryLimit: number = 5, intervals=5000) => {
      try {
        // todo: save/load history and check if scripts exist on-chain.
        retry++;
        console.log(`ready to deploy scripts ${script_name}..`);
        const contract_code_hash = await readScriptCodeHashFromFile(script_path);
        const { outpoint, script_hash } = await api.deployLayer1ContractWithTypeId(contract_code_hash, user_private_key);
        console.log(`finished deploying script ${script_name}, outpoint: ${JSON.stringify(outpoint)}, script_hash: ${script_hash}`);
        deploy_counter ++;
      } catch (e) {
        console.error(e);
        if(retry < maxRetryLimit){
          await asyncSleep(intervals);
          console.log(`retry...${retry}th times`);
          run_deploy_script(script_name, script_path, maxRetryLimit);
        }else{
          console.error(`failed to deploy godwoken script ${script_name}.`);
          res.send({status: 'failed', data: `failed to deploy godwoken script ${script_name}.`});
        }
      }
      if(deploy_counter === total_scripts_number){
        console.timeEnd("deploy godwoken scripts");
        res.send({status: 'ok', data: `success deployed ${total_scripts_number} godwoken scripts. finished~`});
      }
    };

    let scripts_tx_hash_list: HexString[] = [];
    for(const script_name of script_names){
      // script path will be header.
      const script_path =  '/code/workspace/' + scripts_info[script_name];
      // each script will try re-deploy when failed, retry will be 5 times max.
      // run_deploy_script(script_name, script_path);
      console.log(`ready to deploy script: ${script_name}, file_path: ${script_path}`);
      const contract_code_hash = await readScriptCodeHashFromFile(script_path);
      const tx_hash = await api.constructScriptDeployTransaction(contract_code_hash, miner_private_key);
      scripts_tx_hash_list.push(tx_hash);
    }

    for(const tx_hash of scripts_tx_hash_list){
      await api.waitForCkbTx(tx_hash);
      deploy_counter ++; 
    }

    if(deploy_counter === total_scripts_number){
      res.send({status: 'ok', data: `success deployed ${total_scripts_number} godwoken scripts. finished~`});
    }else{
      res.send({status:'failed', data: `only deployed ${deploy_counter}, total: ${total_scripts_number}`});
    }
  } catch (error) {
    res.send({status: 'failed', error: error.message}); 
  }
});

app.get('/deploy_script', async function(req, res){
  try {
    const script_name: string = req.query.script_name + '';
    const script_path = req.query.script_path + '';

  //  const _indexer_path = path.resolve(__dirname, `${INDEXER_ROOT_DB_PATH}/ckb-indexer-data-deploy-scripts`);
  //  const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
  //  api.syncLayer1();

    var retry = 0;
    const run_deploy_script = async (maxRetryLimit: number, intervals=5000) => {
      try {
        // todo: save/load history and check if scripts exist on-chain.
        retry++;
        const contract_code_hash = await readScriptCodeHashFromFile(script_path);
        const { outpoint, script_hash } = await api.deployLayer1ContractWithTypeId(contract_code_hash, user_private_key);
        console.log(`deploy script ${script_name}, outpoint: ${JSON.stringify(outpoint)}, script_hash: ${script_hash}`);
        console.log(`finished~`);
        res.send({status: 'ok', data: `deploy script ${script_name}, outpoint: ${JSON.stringify(outpoint)}. finished~`});
      } catch (e) {
        console.error(e);
        if(retry < maxRetryLimit){
          await asyncSleep(intervals);
          console.log(`retry...${retry}th times`);
          run_deploy_script(maxRetryLimit);
        }else{
          console.error(`failed to deploy godwoken script ${script_name}.`);
          res.send({status: 'failed', data: `failed to deploy godwoken script ${script_name}.`});
        }
      }
    };
   
    // retry 20 times max.
    await run_deploy_script(20);
  } catch (error) {
    res.send({status: 'failed', error: error}); 
  }
});

export function start () {
   app.listen(PolymanConfig.prepare_service_port, () => {
       console.log(`preparetion server started at http://localhost:${PolymanConfig.prepare_service_port}`);
   });
}
