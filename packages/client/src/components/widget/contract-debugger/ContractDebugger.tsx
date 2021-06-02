import React from 'react';
import { useState, useEffect } from 'react';
import { AbiInput, AbiItem } from 'web3-utils';
import Web3Api from '../../../api/web3'
import { AbiCoder } from 'web3-eth-abi';
import {notify} from '../notify';
import commonStyle from '../common_style';
import utils from '../../../utils/index';

const Web3EthAbi = require('web3-eth-abi');

const styles = {...commonStyle, ...{
    container: {
        
    },
    method_item: {
        textAlign: 'left' as const,
        maxWidth: '700px',
        margin: '0 auto',
    },
    method_box: {
        fontSize: '14px',
        border: '1px solid gray',
        padding: '20px',
        textAlign: 'left' as const,
        maxWidth: '700px',
        margin: '0 auto',
        display: 'block',
    },
    method_name: {
        textAlign: 'left' as const, 
        fontSize: '16px', 
        padding: '10px 0',
        color: commonStyle.main_color.color
    },
    return_value: {
        border: '1px solid gray', 
        padding: '5px',
    },
    param_input: {
        width: '100%',
        padding: '5px',
    },
    submit_btn: {
        padding: '5px',
    },
    select_abi_file: {
        fontSize: '14px',

    },
    contract_addr_input_container: {
        maxWidth: '600px',
        margin: '0 auto',
    },
    contract_addr_input: {
        width: '100%',
        padding: '5px',
        fontSize: '16px',
    },
    setting_container: {
        maxWidth: '700px',
        border: '1px solid gray',
        margin: '10px auto',
        padding: '10px 0',
    },
    log_container: {
        maxWidth: '700px',
        border: '1px solid gray',
        margin: '10px auto',
        padding: '10px 0',
        textAlign: 'left' as const,
    },
    log_container_title: {
        fontSize: '16px',
        color: commonStyle.main_color.color,
        textAlign: 'center' as const,
    },
    log_main_area: {
        fontSize: '14px',
        textAlign: 'left' as const,
        padding: '10px',
        margin: '5px',
    }
}
}

const SIMPLE_STORAGE_ABI: AbiItem[] = []


export default function ContractDebbuger () {
    const web3Api = new Web3Api();
    const [abi, setAbi] = useState<AbiItem[]>(SIMPLE_STORAGE_ABI);
    const [contractAddr, setContractAddr] = useState<string>();

    const [callLogs, setCallLogs] = useState<string[]>([]);
    
    useEffect(()=> {
        
    }, []);

    const readContractAbiFile = async (event: any) => {
        const codefile = event.target.files[0]; 
        const res: any = await utils.readDataFromFile(codefile);
        console.log(res);
        if(res.status !== 'ok'){
          return notify(`can not read contract abi from file.`);
        };
        return JSON.parse(res.data);
    }

    const handleAbiFileChange = async (event: any) => {
        const abi = await readContractAbiFile(event);
        await setAbi(abi);
    }

    const handleContractAddrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setContractAddr(event.target.value);
    }

    const method_list = (abi: AbiItem[]) => {
        
        return abi.filter( (item) => item.type === 'function' ).map( (item: AbiItem, item_index: number) => 
        {
            var input_params: string[] = [];
            var output_values: string[] = [];

            const hanleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                input_params[parseInt(event.target.name)] = event.target.value;
            }

            const assemble_tx = async (abi_item: AbiItem, input_params: string[]) => {
                if (abi_item.type !== 'function')
                    throw new Error("expect a function");
        
                if (abi_item.stateMutability === 'view') {
                    try {
                        await assemble_call_view_tx(abi_item, input_params);   
                    } catch (error) {
                        notify(JSON.stringify(error, null, 2));   
                    }
                }
        
                if (abi_item.stateMutability !== 'view') {
                    try {
                        await assemble_send_payable_tx(abi_item, input_params); 
                    } catch (error) {
                        notify(JSON.stringify(error, null, 2));   
                    }
                }
            }
        
            const assemble_call_view_tx = async (item: AbiItem, input_params: string[]) => {
                const data = Web3EthAbi.encodeFunctionCall(item, input_params);
                const eth_tx = {
                  gasPrice: '0x00000000000', 
                  gas: '0x2710', 
                  to: contractAddr || '0x', 
                  from: window.ethereum.selectedAddress, 
                  data: data, 
                };
                console.log(eth_tx);
                const result = await window.ethereum.request({
                  method: 'eth_call',
                  params: [eth_tx],
                });
                const decode_res_arr = Web3EthAbi.decodeParameters(item.outputs?.map(o=>o.type), result);
                console.log(decode_res_arr);
                for(let i = 0; i < decode_res_arr.__length__; i++){
                    output_values[i] = decode_res_arr[i+'']; 
                }
                console.log(output_values);
                 
                // notify user the result
                notify(JSON.stringify(output_values, null, 2), 'success');
                // update return value in the global log state
                await setCallLogs(oldArray => [...oldArray, `call "${item.name}", receive return value: ${JSON.stringify(output_values)}`]);
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
                
                notify('wait for tx landing on chain, open your console page to check more.', 'success');

                await getEthTxReceipt(txHash);

                // notify user the result
                notify('tx commited.', 'success');
                // update return value in the global log state
                await setCallLogs(oldArray => [...oldArray, `call "${item.name}", tx ${txHash} commited.`]);
            }
        
            const getEthTxReceipt = async (txHash: string) => {
                console.log(`txHash: ${txHash}`);
                await web3Api.waitForTransactionReceipt(txHash);
                const txReceipt = await web3Api.getTransactionReceipt(txHash); 
                console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);
                return txReceipt;
            }

            return ( 
            <div style={styles.method_item}>
                <span style={styles.method_name}> {item_index + 1}. {item.name} </span>
                <li key={item_index} style={styles.method_box}>
                <p> {item.inputs?.map( (input, i) => {
                    input_params.push('');
                    return <li key={"intputs_"+i}>
                     <p> 
                       <input style={styles.param_input} onChange={hanleChange} name={i+''} type="text" placeholder={input.type} /> 
                     </p>
                    </li>
                } )} 
                </p>

                <button style={styles.submit_btn} onClick={()=>{assemble_tx(item, input_params)}}> { item.stateMutability === 'view' ? "call" : "send tx" } </button>
            </li> </div>)
        })
    }
    
    return(
        <div style={styles.container}>
            <div style={styles.setting_container}>
                <p style={styles.select_abi_file}>
                <label>Upload Contract ABI：</label>
                    <input
                      type="file"
                      placeholder="abi file"
                      onChange={handleAbiFileChange}
                    />
                </p>
                <p style={styles.contract_addr_input_container}>
                   <input type="text" placeholder="contract address" style={styles.contract_addr_input} onChange={handleContractAddrChange} />
                </p>
            </div>

            <div style={styles.log_container}>
                <div style={styles.log_container_title}> Logs </div>
                <div style={styles.log_main_area}>
                    {
                       callLogs.map((log,i)=><li key={i}>{i}: {log}</li>)
                    }
                </div>
            </div>
            
           { method_list(abi) } 
        </div>
    )
}
