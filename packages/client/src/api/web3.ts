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

    async waitForTransactionReceipt(tx_hash: string, timeout: number = 300, loopInterval = 3){
      for (let index = 0; index < timeout; index += loopInterval) {
          
          const tx_receipt = await this.getTransactionReceipt(
            tx_hash
          );

          console.log(`keep fetching tx_receipt with ${tx_hash}, waited for ${index} seconds`);
          await util.asyncSleep(loopInterval * 1000);
  
          if (tx_receipt !== null) {
            return;
          }
        }
        throw new Error(`cannot fetch tx_receipt with tx ${tx_hash} in ${timeout} seconds`);;
    }
}
