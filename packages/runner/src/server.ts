import { Api } from './api';
import path from 'path';
import express from 'express';
import cors from "cors";
import timeout from "connect-timeout";
import serverConfig from "../configs/server.json";
import gpConfig from "../configs/config.json";
import { getRollupTypeHash } from '../js/transactions/deposition';
// import { generateGodwokenConfig } from './util';
import godwoken_config from "../configs/godwoken_config.json";
import { deploymentConfig } from "../js/utils/deployment_config";
import fs from 'fs';
import { UInt32ToLeBytes } from "./util";

const indexer_path = path.resolve(__dirname, "../db/ckb-indexer-data");

const ckb_rpc = process.env.MODE === "docker-compose" ? gpConfig.ckb.rpc[0] : gpConfig.ckb.rpc[1];
const godwoken_rpc = process.env.MODE === "docker-compose" ? gpConfig.godwoken.rpc[0] : gpConfig.godwoken.rpc[1] ;
const sudt_id_str = serverConfig.default_sudt_id_str;
const default_deposit_amount = serverConfig.default_amount;
const default_sudt_capacity = serverConfig.default_amount; 
const user_private_key = serverConfig.user_private_key;
const user_ckb_address = serverConfig.user_ckb_devnet_addr;
const miner_private_key = serverConfig.miner_private_key;
const miner_ckb_address = serverConfig.miner_ckb_devnet_addr;
const change_amount = '10000000000'; // 100 ckb change for pay fee.

const api = new Api(ckb_rpc, godwoken_rpc, indexer_path);
api.syncLayer1();

export const app = express();
const corsOptions = {
    origin: serverConfig.cros_server_list,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
}
app.use(cors(corsOptions));
app.use('/static', express.static(path.join(__dirname, '../../src/resource')));
app.use(timeout('300s')); // keep alive for a long time
app.use(express.urlencoded({ extended: false, limit: '1mb' })); // for uploading very large contract code
app.use(express.json({limit: '1mb'}));

const setUpRouters = (  
    rollup_type_hash: string, 
    sudt_id_str: string,
    user_private_key: string,
    user_ckb_address: string,
    miner_private_key: string,
    miner_ckb_address: string
) => {

    app.get( "/", ( req, res ) => {
        res.send({status: 'ok', data: "you just reach polyjuice api server."});
    } );

    app.get("/get_rollup_type_hash", ( req, res ) => {
       res.send({status: 'ok', data: rollup_type_hash}); 
    });

    app.get("/get_godwoken_config", ( req, res ) => {
        res.send({status: 'ok', data: godwoken_config}); 
    });

    app.get("/get_eth_acccount_lock", ( req, res ) => {
        res.send({status: 'ok', data: deploymentConfig.eth_account_lock });
    });

    app.post( "/send_l2_tx", async ( req, res ) => {
        try {
            const raw_l2tx = req.body.data.raw_l2tx;
            const signature = req.body.data.signature;
            const type = req.body.data.type;
            await api.syncToTip();
            const tx_hash = await api.sendLayer2Transaction(raw_l2tx, signature);
            switch (type) {
                case 'create_creator':
                    const id = await api.waitForCreateCreator(sudt_id_str);
                    res.send({status:'ok', data: {run_result: tx_hash, account_id: id }});
                    break;
            
                case 'deploy':
                    const contract_id = await api.waitForDeolyedContractOnChain(raw_l2tx, rollup_type_hash);
                    //const tx_receipt = await api.getTransactionReceipt(tx_hash);
                    //console.log(`tx_receipt: ${JSON.stringify(tx_receipt, null, 2)}`);
                    //const contract_id = await api.watiForDeployTx();
                    const contract_address = await api.polyjuice!.accountIdToAddress(contract_id);
                    res.send({status:'ok', data: {run_result: tx_hash, account_id: contract_id, contract_address: contract_address  }});
                    break;

                case 'transfer':
                    res.send({status: 'ok', data: {run_result: tx_hash}});
                    break;
    
                case 'deposit':
                    break;
    
                default:
                    res.send({status:'failed', error: `unknow type ${type}.`});
                    break;
            }
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );
    
    app.get( "/deposit", async ( req, res ) => {
        try {
            const eth_address = req.query.eth_address + '';
            await api.syncToTip();
            const account_id = await api.deposit(user_private_key, eth_address, default_deposit_amount);
            console.log(account_id);
            res.send({status:'ok', data: {eth_address: eth_address, account_id: account_id}});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );

    app.get( "/deposit_sudt", async ( req, res) => {
        try {
            const eth_address = req.query.eth_address + '';
            const {account_id, l2_sudt_script_hash} = await api.deposit_sudt(user_private_key, eth_address, default_deposit_amount, default_deposit_amount);
            res.send({status:'ok', data: {account_id, l2_sudt_script_hash}});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error}); 
        }
    } );

    app.get( "/issue_token", async ( req, res) => {
        try {
            const sudt_token = await api.issueToken(default_deposit_amount, user_private_key);
            res.send({status:'ok', data: {sudt_token: sudt_token}});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );

    app.get( "/prepare_change_money", async ( req, res) => {
        try {
            await api.giveUserLayer1AccountSomeMoney(
                miner_ckb_address, 
                miner_private_key, 
                user_ckb_address, 
                BigInt(change_amount) 
            );
            res.send({status:'ok', data: {amount: change_amount }});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );


  // app.post("/transfer", async ( req, res ) => {
  //   try {
  //     const to_id_str = req.body.data.to_id + '';
  //     const amount_str = req.body.data.amount + '';
  //     const fee_str = req.body.data.fee + '';
  //     const eth_address = req.body.data.eth_address + '';
  //     await api.syncToTip();
  //     const data = await api.generateTransferTx(sudt_id_str, to_id_str, amount_str, fee_str, rollup_type_hash, eth_address);
  //     res.send({status:'ok', data: data});
  //   } catch (error) {
  //     console.log(error);
  //     res.send({status:'failed', error: error});
  //   }
  // });

    app.get( "/create_creator_account", async ( req, res ) => {
        try {
            const from_id = req.query.from_id + '';
            await api.syncToTip();
            const data = await api.generateCreateCreatorAccountTx(from_id, sudt_id_str, rollup_type_hash);
            res.send({status:'ok', data: data});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );
    
    
    app.post( "/deploy_contract", async ( req, res ) => {
        try {
            const creator_account_id = await api.findCreateCreatorAccoundId(sudt_id_str);
            if(!creator_account_id)
                return res.send({status:'failed', error: `creator_account_id not found.`});
            
            const contract_code = req.body.data.contract_code + '';
            const eth_address = req.body.data.eth_address + '';
            await api.syncToTip();
            const data = await api.generateDeployTx(creator_account_id.toString(), contract_code, rollup_type_hash, eth_address);
            res.send({status:'ok', data: data});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );

    app.post( "/deploy_erc20_proxy_contract", async ( req, res ) => {
        try {
            const creator_account_id = await api.findCreateCreatorAccoundId(sudt_id_str);
            if(!creator_account_id)
                return res.send({status:'failed', error: `creator_account_id not found.`});
            
            const contract_file = path.resolve(__dirname, "../configs/erc20proxy.bin");
            const contract_code = '0x' + await fs.readFileSync(contract_file).toString('utf-8');
            const eth_address = req.body.data.eth_address + '';
            await api.syncToTip();
            // get sudt id
            const sudt_script_hash = api.getL2SudtScriptHash(user_private_key); 
            const sudt_id = await api.godwoken.getAccountIdByScriptHash(sudt_script_hash);
            console.log(`sudt_id: ${sudt_id}`);
            if(!sudt_id)
                return res.send({status:'failed', error: `sudt account not exits. deposit sudt first.`});

            const data = await api.generateErc20ProxyContractCode(
                sudt_id + '',
                creator_account_id.toString(), 
                contract_code, 
                rollup_type_hash, 
                eth_address
            );
            res.send({status:'ok', data: data});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );

    app.post( "/deploy_sudt_contract", async (req, res) => {
        try {
            await api.deployLayer1Sudt(miner_private_key);
            res.send({status:'ok', data: null});
        } catch (error) {
            res.send({status:'failed', error: JSON.stringify(error)});
        }
    } )
    
    app.get( "/get_layer2_balance", async ( req, res ) => {
        try {
            const eth_address = req.query.eth_address + '';
            await api.syncToTip();
            const _account_id = await api.getAccountIdByEthAddr(eth_address);
            const account_id = parseInt(_account_id+'');
            if(!account_id)
                return res.send({status:'failed', error: `account not exits. deposit first.`}); 
            
            // todo: add block parameter
            const balance = await api.godwoken.getBalance(1, account_id);
            res.send({status:'ok', data: balance.toString()});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );

    app.get( "/get_tx_receipt", async ( req, res ) => {
        try {
            const tx_hash = req.query.tx_hash + '';
            await api.syncToTip();
            const receipt = await api.getTransactionReceipt(tx_hash);
            res.send({status:'ok', data: receipt});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );

    app.get( "/get_contract_addr_by_account_id", async ( req, res ) => {
        try {
            const account_id_str = req.query.account_id + '';
            const account_id = parseInt(account_id_str, 16);
            await api.syncToTip();
            const account_script_hash = await api.getScriptHashByAccountId(account_id);
            const contract_addr = '0x' +
                account_script_hash.slice(2, 16 * 2 + 2) +
                UInt32ToLeBytes(account_id);
            res.send({status:'ok', data: contract_addr});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );

    // todo: merge this two methods to one with a simpel flag.
    
    app.get( "/get_layer2_sudt_balance", async ( req, res ) => {
        try {
            const eth_address = req.query.eth_address + '';
            const sudt_token_args = req.query.sudt_token + '';
            await api.syncToTip();

            const _account_id = await api.getAccountIdByEthAddr(eth_address);
            const account_id = parseInt(_account_id+'');
            if(!account_id)
                return res.send({status:'failed', error: `account not exits. deposit first.`}); 
            const sudt_script_hash = api.getL2SudtScriptHash(user_private_key); 
            const sudt_id = await api.godwoken.getAccountIdByScriptHash(sudt_script_hash);
            console.log(`sudt_id: ${sudt_id}`);
            if(!sudt_id)
                return res.send({status:'failed', error: `sudt account not exits. deposit sudt first.`});

            const balance = await api.godwoken.getBalance(parseInt(sudt_id+''), account_id);
            res.send({status:'ok', data: balance.toString()});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );
}

export async function start() {
    await api.waitForGodwokenStart();

    // generate config file from config.toml
    // await generateGodwokenConfig('../configs/config.toml', 
    //                              '../configs/godwoken_config.json');

    var rollup_type_hash = getRollupTypeHash();

    // start a polyjuice chain
    try {
        await api.syncToTip();
        const createCreatorId = await api.findCreateCreatorAccoundId(sudt_id_str);
        if(createCreatorId === null){
            const from_id = await api.deposit(user_private_key, undefined, default_deposit_amount);
            //const from_id = '0x2';
            console.log(`create deposit account.${from_id}`);
            const creator_account_id = await api.createCreatorAccount(
              from_id,
              sudt_id_str,
              rollup_type_hash,
              user_private_key
            );
            console.log(`create creator account.`);
            console.log(`init polyjuice chain.`);
        }else{
            console.log(`polyjuice chain already exits. skip.`);
        }
    } catch (e) {
        throw new Error(e);
    }

    // start api server
    setUpRouters(
        rollup_type_hash,
        sudt_id_str,
        user_private_key,
        user_ckb_address,
        miner_private_key,
        miner_ckb_address,
    );
    app.listen( serverConfig.server_port, () => {
        console.log( `api server started at http://localhost:${ serverConfig.server_port }` );
    } );
    return;
}
