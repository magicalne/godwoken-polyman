import { Api } from './api';
import path from 'path';
import express from 'express';
import cors from "cors";
import timeout from "connect-timeout";
import serverConfig from "../configs/server.json";
import gpConfig from "../configs/config.json";
import { getRollupTypeHash } from '../js/transactions/deposition';

const indexer_path = path.resolve(__dirname, "../db/ckb-indexer-data");

const ckb_rpc = gpConfig.ckb.rpc[0];
const godwoken_rpc = gpConfig.godwoken.rpc[0];
const sudt_id_str = serverConfig.default_sudt_id_str;
const amount = serverConfig.default_amount;
const user_private_key = serverConfig.user_private_key;

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
app.use(express.urlencoded({ extended: false, limit: '1gb' })); // for uploading very large contract code

const setUpRouters = (  
    rollup_type_hash: string, 
    sudt_id_str: string,
    user_private_key: string
) => {

    app.get( "/", ( req, res ) => {
        res.send({status: 'ok', data: "you just reach polyjuice api server."});
    } );

    app.get("/get_rollup_type_hash", ( req, res ) => {
       res.send({status: 'ok', data: rollup_type_hash}); 
    });
    
    app.get( "/send_l2_tx", async ( req, res ) => {
        try {
            const raw_l2tx = JSON.parse(req.query.raw_l2tx + '');
            const signature = req.query.signature + '';
            const type = req.query.type + '';
            await api.syncToTip();
            const run_result = await api.sendLayer2Transaction(raw_l2tx, signature);
            switch (type) {
                case 'create_creator':
                    const id = await api.waitForCreateCreator(sudt_id_str);
                    res.send({status:'ok', data: {run_result: run_result, account_id: id }});
                    break;
            
                case 'deploy':
                    const contract_id = await api.watiForDeployTx(Object.keys(run_result.new_scripts)[0]);
                    const contract_address = await api.polyjuice!.accountIdToAddress(contract_id);
                    res.send({status:'ok', data: {run_result: run_result, account_id: contract_id, contract_address: contract_address }});
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
            const account_id = await api.deposit(user_private_key, eth_address, amount);
            console.log(account_id);
            res.send({status:'ok', data: {eth_address: eth_address, account_id: account_id}});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );
    
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
    
    
    app.get( "/deploy_contract", async ( req, res ) => {
        try {
            const creator_account_id = await api.findCreateCreatorAccoundId(sudt_id_str);
            if(!creator_account_id)
                return res.send({status:'failed', error: `creator_account_id not found.`});
    
            const contract_code = req.query.contract_code + '';
            const eth_address = req.query.eth_address + '';
            await api.syncToTip();
            const data = await api.generateDeployTx(creator_account_id.toString(), contract_code, rollup_type_hash, eth_address);
            res.send({status:'ok', data: data});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );
    
    app.get( "/get_layer2_balance", async ( req, res ) => {
        try {
            const eth_address = req.query.eth_address + '';
            await api.syncToTip();
            const account_id = await api.getAccountIdByEthAddr(eth_address);
            if(!account_id)
                return res.send({status:'failed', error: `account not exits. deposit first.`}); 
            const balance = await api.godwoken.getBalance(1, account_id);
            res.send({status:'ok', data: balance.toString()});
        } catch (error) {
            console.log(error);
            res.send({status:'failed', error: error});
        }
    } );
}

export async function start() {
    await api.waitForGodwokenStart();
    var rollup_type_hash = getRollupTypeHash();
    // start a polyjuice chain
    try {
        await api.syncToTip();
        const createCreatorId = await api.findCreateCreatorAccoundId(sudt_id_str);
        if(createCreatorId === null){
            const from_id = await api.deposit(user_private_key, undefined, amount);
            console.log(`create deposit account.`);
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
        user_private_key
    );
    app.listen( serverConfig.server_port, () => {
        console.log( `api server started at http://localhost:${ serverConfig.server_port }` );
    } );
    return;
}