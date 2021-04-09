import { Api } from './api';
import path from 'path';
import express from 'express';
import cors from "cors";
import timeout from "connect-timeout";
import Config from "../configs/server.json";
import { ethAddress } from './common';

const port = 5000; 
const indexer_path = path.resolve(__dirname, "../db/ckb-indexer-data");
const ckb_rpc = "http://127.0.0.1:8114";
const godwoken_rpc = "http://127.0.0.1:8119";
const rollup_type_hash =
  "0x49a0d86dafc58a2826174b1aac6609d2736a0c50e5ef031a5252babab4e98272";
const sudt_id_str =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const amount = "40000000000";
const private_key =
  "0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b";

const corsOptions = {
    origin: Config.CROS_SERVER_LIST,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
}

const api = new Api(ckb_rpc, godwoken_rpc, indexer_path);
api.syncLayer1();

const app = express();
app.use(cors(corsOptions));
app.use('/static', express.static(path.join(__dirname, '../../src/resource')));
app.use(timeout('300s')); // keep alive for long time
app.use(express.urlencoded({ extended: false, limit: '1gb' })); // for uploading very large contract code

app.get( "/", ( req, res ) => {
    res.send( "Hello world!" );
} );

app.get( "/start_polyjuice", async ( req, res ) => {
    try {
        const eth_address = req.query.eth_address + '';
        await api.clean_sync();
        const from_id = await api.deposit(private_key, eth_address, amount);
        const data = await api.generateCreateCreatorAccountTx(from_id, sudt_id_str, rollup_type_hash);
        res.send({status:'ok', data: data});
    } catch (error) {
        console.log(error);
        res.send({status:'failed', error: error});
    }
} );

app.get( "/send_l2_tx", async ( req, res ) => {
    try {
        const raw_l2tx = JSON.parse(req.query.raw_l2tx + '');
        const signature = req.query.signature + '';
        const type = req.query.type + '';
        await api.clean_sync();
        const run_result = await api.sendLayer2Transaction(raw_l2tx, signature);
        switch (type) {
            case 'create_creator':
                const id = await api.waitForCreateCreator(sudt_id_str);
                res.send({status:'ok', data: {run_result: run_result, account_id: id }});
                break;
        
            case 'deploy':
                //const l2_script_args = req.query.l2_script_args+'';
                const contract_id = await api.watiForDeployTx(Object.keys(run_result.new_scripts)[0]);
                res.send({status:'ok', data: {run_result: run_result, account_id: contract_id }});
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
        await api.clean_sync();
        const account_id = await api.deposit(private_key, eth_address, amount);
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
        await api.clean_sync();
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
        await api.clean_sync();
        const data = await api.generateDeployTx(creator_account_id.toString(), contract_code, rollup_type_hash, eth_address);
        res.send({status:'ok', data: data});
    } catch (error) {
        console.log(error);
        res.send({status:'failed', error: error});
    }
} );


app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );