import path from 'path';
import { Api } from './api';

const _indexer_path = path.resolve(__dirname, '../db/ckb_indxer'); 
const ckb_rpc= 'http://127.0.0.1:8114';
const godwoken_rpc = 'http://127.0.0.1:8119';
const rollup_type_hash = '0x49a0d86dafc58a2826174b1aac6609d2736a0c50e5ef031a5252babab4e98272';
const sudt_id_str = '0x0000000000000000000000000000000000000000000000000000000000000000';
const amount = '40000000000';
const private_key = '0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b'; 
const eth_address = '0xdb35f58677b7C1339D1a030a0dbb23454A45DD95';
const contract_code = '60806040525b607b60006000508190909055505b610018565b60db806100266000396000f3fe60806040526004361060295760003560e01c806360fe47b114602f5780636d4ce63c14605b576029565b60006000fd5b60596004803603602081101560445760006000fd5b81019080803590602001909291905050506084565b005b34801560675760006000fd5b50606e6094565b6040518082815260200191505060405180910390f35b8060006000508190909055505b50565b6000600060005054905060a2565b9056fea2646970667358221220044daf4e34adffc61c3bb9e8f40061731972d32db5b8c2bc975123da9e988c3e64736f6c63430006060033';

const run = async () => {
    console.log('start..');
    const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
    try {
        await api.syncLayer1();
        const from_id = await api.deposit(private_key, eth_address, amount);
        const creator_account_id = await api.createCreatorAccount(from_id, sudt_id_str, rollup_type_hash, private_key);
        const contract_account_id = await api.deploy(creator_account_id, contract_code, rollup_type_hash, private_key);
        console.log(`contract id: ${contract_account_id}`);
        console.log(`finished~`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();