import { RawL2Transaction } from '@godwoken-examples/godwoken';
import axios from 'axios';
import { StringifyOptions } from 'node:querystring';
import config from '../config/constant.json';
import { OpType } from '../types/polyjuice';
import utils from '../utils/index';

axios.defaults.withCredentials = true;

class Api{

    base_url: string;

    constructor(){
        this.base_url = utils.get_env_mode() === 'development' ? config.development_server_url : config.production_server_url;
    };

    async getBalance(eth_address: string){
        let res = await axios.get(`${this.base_url}/get_layer2_balance`, { 
            params:{
                eth_address: eth_address
            }
        });
        return res.data;
    };  

    async deposit(eth_address: string){
        let res = await axios.get(`${this.base_url}/deposit`, { 
            params:{
                eth_address: eth_address
            }
        });
        return res.data;
    }; 

    async deployContract(contract_code: string, eth_address: StringifyOptions ){
        let res = await axios.get(`${this.base_url}/deploy_contract`, { 
            params:{
                contract_code: contract_code,
                eth_address: eth_address,
            }
        });
        return res.data;
    };

    async sendL2Transaction(raw_l2tx: RawL2Transaction, signature: string, type: OpType, l2_script_args?: string){
        let res = await axios.get(`${this.base_url}/send_l2_tx`, { 
            params:{
                raw_l2tx: raw_l2tx,
                signature: signature,
                type: type,
                l2_script_args: l2_script_args
            }
        });
        return res.data;
    };



}

export default Api;
