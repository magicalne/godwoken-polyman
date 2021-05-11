import { RawL2Transaction } from '@godwoken-examples/godwoken';
import axios from 'axios';
import config from '../config/constant.json';
import { OpType } from '../types/polyjuice';
import utils from '../utils/index';

axios.defaults.withCredentials = true;

class Api{

    base_url: string;

    constructor(){
        this.base_url = utils.get_env_mode() === 'development' ? config.development_server_url : config.production_server_url;
    };

    async getRollupTypeHash(){
        let res = await axios.get(`${this.base_url}/get_rollup_type_hash`, { 
            params:{
            }
        });
        return res.data;
    };
    
    async getEthAccountLockConfig(){
        let res = await axios.get(`${this.base_url}/get_eth_acccount_lock`, {
            params:{
            }
        });
        return res.data;
    };

    async getBalance(eth_address: string){
        let res = await axios.get(`${this.base_url}/get_layer2_balance`, { 
            params:{
                eth_address: eth_address
            }
        });
        return res.data;
    };  

    async getSudtBalance(eth_address: string){
        let res = await axios.get(`${this.base_url}/get_layer2_sudt_balance`, { 
            params:{
                eth_address: eth_address
            }
        });
        return res.data;
    };  

    async issueToken(){
        let res = await axios.get(`${this.base_url}/issue_token`, { 
            params:{
            }
        });
        return res.data; 
    }

    async getSudtToken(){
        let res = await axios.get(`${this.base_url}/get_sudt_token`, {

        });
        return res.data;
    }

    async getSudtTokenTotalAmount(){
        let res = await axios.get(`${this.base_url}/get_sudt_token_total_amount`, {

        });
        return res.data;
    }

    async deposit(eth_address: string){
        let res = await axios.get(`${this.base_url}/deposit`, { 
            params:{
                eth_address: eth_address
            }
        });
        return res.data;
    }; 

    async deposit_sudt(eth_address: string){
        let res = await axios.get(`${this.base_url}/deposit_sudt`, { 
            params:{
                eth_address: eth_address
            }
        });
        return res.data;
    }

  async transfer(to_id: string, amount: string, fee: string, eth_address: string) {
    let res = await axios.post(`${this.base_url}/transfer`, {
      data: {
        to_id: to_id,
        amount: amount,
        fee: fee,
        eth_address: eth_address,
      }
    });
    return res.data;
  }

    async deployContract(contract_code: string, eth_address: string ){
        let res = await axios.post(`${this.base_url}/deploy_contract`, { 
            data:{
                contract_code: contract_code,
                eth_address: eth_address,
            }
        });
        return res.data;
    };

    async deployErc20ProxyContract(eth_address: string){
        let res = await axios.post(`${this.base_url}/deploy_erc20_proxy_contract`, { 
            data:{
                eth_address: eth_address,
            }
        });
        return res.data;
    }; 

    async deploySudtContract() {
        let res = await axios.post(`${this.base_url}/deploy_sudt_contract`, { 
            data:{
            }
        });
        return res.data; 
    }

    async sendL2Transaction(raw_l2tx: RawL2Transaction, signature: string, type: OpType, l2_script_args?: string){
        let res = await axios.post(`${this.base_url}/send_l2_tx`, { 
            data:{
                raw_l2tx: raw_l2tx,
                signature: signature,
                type: type,
                l2_script_args: l2_script_args
            }
        });
        return res.data;
    };

    async getTransactionReceipt(tx_hash: string){
        let res = await axios.get(`${this.base_url}/get_tx_receipt`, { 
            params:{
                tx_hash: tx_hash
            }
        });
        return res.data;
    }
    //
    async getContractAddrByAccountId(account_id: string){
        let res = await axios.get(`${this.base_url}/get_contract_addr_by_account_id`, { 
            params:{
                account_id: account_id
            }
        });
        return res.data;
    }

}

export default Api;
