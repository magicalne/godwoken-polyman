import axios from 'axios';
import config from '../config/constant.json';
import util from '../utils/index';

axios.defaults.withCredentials = false;

export default class Web3Api{

    url: string;

    constructor(){
        this.url = config.web3_server_url;
    };


    async getBalance(eth_address: string){
        let response = await axios.post(this.url, {
            jsonrpc: '2.0',
            id: + new Date(),
            method: 'eth_getBalance',
            params: [eth_address],
        }, {
              headers: {
                'Content-Type': 'application/json',
              },
            
        });
        return response.data.result;
    }

    async getTransactionReceipt(tx_hash: string){
        let response = await axios.post(this.url, {
            jsonrpc: '2.0',
            id: + new Date(),
            method: 'eth_getTransactionReceipt',
            params: [tx_hash],
        }, {
              headers: {
                'Content-Type': 'application/json',
              },
        });
        return response.data.result;
    }

    async waitForTransactionReceipt(tx_hash: string){
        while (true) {
          await util.asyncSleep(1000);
          const tx_receipt = await this.getTransactionReceipt(
            tx_hash
          );
          console.log(`tx_receipt: ${tx_receipt}`);
      
          if (tx_receipt) {
            break;
          }
        }
        return;
    }

}
