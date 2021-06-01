import React from 'react';
import { useState, useEffect } from 'react';
import { AbiInput, AbiItem } from 'web3-utils';
import Web3Api from '../../../api/web3'
import { AbiCoder } from 'web3-eth-abi';
import {notify} from '../notify';

const Web3EthAbi = require('web3-eth-abi');

const styles = {
    container: {
        
    },
    method_box: {
        fontSize: '14px',
        border: '1px solid gray',
        padding: '20px',
        textAlign: 'left' as const,
        maxWidth: '700px',
        margin: '0 auto',
        display: 'block',
    }
}

const SIMPLE_STORAGE_ABI: AbiItem[] = [{"inputs":[],"stateMutability":"payable","type":"constructor"},{"inputs":[],"name":"get","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"x","type":"uint256"}],"name":"set","outputs":[],"stateMutability":"payable","type":"function"}]


export default function ContractDebbuger () {
    const web3Api = new Web3Api();
    const [abi, setAbi] = useState<AbiItem[]>(SIMPLE_STORAGE_ABI);
    const [contractAddr, setContractAddr] = useState<string>();

    useEffect(()=> {
        
    }, []);

    const handleContractAddrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setContractAddr(event.target.value);
    }

    const method_list = (abi: AbiItem[]) => {
        return abi.filter( (item) => item.type === 'function' ).map( (item: AbiItem) => 
        {
            var input_params: string[] = [];

            const hanleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                input_params[parseInt(event.target.name)] = event.target.value;
            }

            return <li style={styles.method_box}>
            <h3> {item.name} </h3>
            <p> tyep: {item.stateMutability} </p>
            <p> {item.inputs?.map( (input, i) => {
                input_params.push('');
                return <li>
                 <p> 
                    name: {input.name} : param: {input.type} - value: <input onChange={hanleChange} name={i+''} type="text" /> 
                 </p>
                </li>
            } )} 
            </p>
            
            <p> {item.outputs?.map( output => <li>
                <p> 
                    name: {output.name} :  param: {output.type} - value: {'undefined'}
                </p>
              </li> )} 
            </p>

            <button onClick={()=>{assemble_tx(item, input_params)}}> submit </button>
        </li>
        }
        )
    }


    const assemble_tx = async (abi_item: AbiItem, input_params: string[]) => {
        if (abi_item.type !== 'function')
            throw new Error("expect a function");

        if (abi_item.stateMutability === 'view') {
            await assemble_call_view_tx(abi_item, input_params);
        }

        if (abi_item.stateMutability !== 'view') {
            await assemble_send_payable_tx(abi_item, input_params);
        }
    }

    const assemble_call_view_tx = async (item: AbiItem, input_params: string[]) => {
        const data = Web3EthAbi.encodeFunctionCall(item, input_params);
        const eth_tx = {
         // nonce: '0x', // ignored by MetaMask
          gasPrice: '0x00000000000', // customizable by user during MetaMask confirmation.
          gas: '0x2710', // customizable by user during MetaMask confirmation.
          to: contractAddr || '0x', // Required except during contract publications.
          from: window.ethereum.selectedAddress, // must match user's active address.
         // value: '0x', // Only required to send ether to the recipient from the initiating external account.
          data: data, // Optional, but used for defining smart contract creation and interaction.
        };
        console.log(eth_tx);
        const result = await window.ethereum.request({
          method: 'eth_call',
          params: [eth_tx],
        });
        //const decode_res = Web3EthAbi.decodeParams()
    }

    const assemble_send_payable_tx = async (item: AbiItem, input_params: string[]) => {
        const data = Web3EthAbi.encodeFunctionCall(item, input_params);
        const eth_tx = {
          nonce: '0x0', // ignored by MetaMask
          gasPrice: '0x9184e72a000', // customizable by user during MetaMask confirmation.
          gas: '0x2710', // customizable by user during MetaMask confirmation.
          to: contractAddr || '0x', // Required except during contract publications.
          from: window.ethereum.selectedAddress, // must match user's active address.
          value: '0x00', // Only required to send ether to the recipient from the initiating external account.
          data: data, // Optional, but used for defining smart contract creation and interaction.
        };
        console.log(eth_tx); 
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [eth_tx],
        });
        await getEthTxReceipt(txHash);
    }

    const getEthTxReceipt = async (txHash: string) => {
        console.log(`txHash: ${txHash}`);
        await web3Api.waitForTransactionReceipt(txHash);
        const txReceipt = await web3Api.getTransactionReceipt(txHash); 
        console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);
        return txReceipt;
    }
    
    return(
        <div style={styles.container}>
            <p>
                contract_addr: <input type="text" onChange={handleContractAddrChange} />
            </p>
           { method_list(abi) } 
        </div>
    )
}
