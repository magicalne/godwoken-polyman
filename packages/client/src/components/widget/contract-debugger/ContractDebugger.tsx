import React from 'react';
import { useState, useEffect } from 'react';
import { toWei, AbiItem } from 'web3-utils';
import Web3Api from '../../../api/web3'
import {notify} from '../notify';
import commonStyle from '../common_style';
import utils from '../../../utils/index';
import config from '../../../config/constant.json';
import Web3 from 'web3';
import PolyjuiceHttpProvider from "@retric/test-provider";
import { GodwokerOption } from "@retric/test-provider/lib/util";

const Web3EthAbi = require('web3-eth-abi');

declare global {
    interface Window { ethereum: any; }
}

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

export type ContractDebbugerProps = {
    godwoken_config: {
        rollup_type_hash: string | undefined,
        eth_account_lock_code_hash: string | undefined,
        eth_account_lock_hash_type: string | undefined,
    }
}

export default function ContractDebbuger (props: ContractDebbugerProps) {

    const { rollup_type_hash, eth_account_lock_code_hash, eth_account_lock_hash_type } = props.godwoken_config;
    
    const web3Api = new Web3Api();
    const [abi, setAbi] = useState<AbiItem[]>(SIMPLE_STORAGE_ABI);
    const [contractAddr, setContractAddr] = useState<string>();

    const [callLogs, setCallLogs] = useState<string[]>([]);
    
    useEffect(()=> {
        
    }, []);

    const init_web3_provider = () => {
        const godwoken_rpc_url = config.web3_server_url;
        const provider_config: GodwokerOption = {
          godwoken: {
            rollup_type_hash: rollup_type_hash || '',
            eth_account_lock: {
              code_hash: eth_account_lock_code_hash || '',
              hash_type: eth_account_lock_hash_type === "type" ? "type" : "data",
            },
          },
        };
        const provider = new PolyjuiceHttpProvider(
          godwoken_rpc_url,
          provider_config,
          abi
        );
        var web3 = new Web3(provider);
        return web3;
    }

    const readContractAbiFile = async (event: any) => {
        const codefile = event.target.files[0]; 
        const res: any = await utils.readDataFromFile(codefile);
        console.log(res);
        if(res.status !== 'ok'){
          notify(`can not read contract abi from file.`);
          throw new Error("can not read contract abi from file.");
        };

        const data = JSON.parse(res.data);
        if ( Array.isArray(data) ){
            // todo: validate abi
            return data;
        }else if( typeof data === 'object' && data.abi ){
            // todo: validate abi
            return data.abi;
        }else{
            notify(`not a valid abi file!`);
            throw new Error("not a valid abi file!");
        }
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
            var payable_value_in_wei: string = '0';

            const hanleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                input_params[parseInt(event.target.name)] = event.target.value;
            }

            const hanlePayableValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                console.log(event.target.value);
                payable_value_in_wei = toWei(event.target.value);
            }

            const assemble_tx = async (abi_item: AbiItem, input_params: string[]) => {
                if (abi_item.type !== 'function')
                    throw new Error("expect a function");
        
                if (abi_item.stateMutability === 'view') {
                    try {
                        await assemble_call_view_tx(abi_item, input_params);   
                    } catch (error) {
                        console.log(error);
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
                  gasPrice: '0x0000', 
                  gas: '0x9184e72a000', 
                  to: contractAddr || '0x'+'0'.repeat(40), 
                  from: window.ethereum.selectedAddress, 
                  data: data, 
                };
                console.log(eth_tx);
                // const result = await window.ethereum.request({
                //   method: 'eth_call',
                //   params: [eth_tx],
                // });
                const web3 = init_web3_provider();
                const result = await web3.eth.call(eth_tx);
                console.log(`web3.eth.call result: ${JSON.stringify(result, null, 2)}`);
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
                console.log(payable_value_in_wei);
                const value = item.payable ? '0x' + BigInt(payable_value_in_wei).toString(16) : '0x00';
                const eth_tx = {
                  gasPrice: '0x0000', // customizable by user during MetaMask confirmation.
                  gas: '0x9184e72a000', // customizable by user during MetaMask confirmation.
                  to: contractAddr || '0x'+'0'.repeat(40), // Required except during contract publications.
                  from: window.ethereum.selectedAddress, // must match user's active address.
                  value: value, // Only required to send ether to the recipient from the initiating external account.
                  data: data, // Optional, but used for defining smart contract creation and interaction.
                };
                console.log(eth_tx); 
                // const txHash = await window.ethereum.request({
                //   method: 'eth_sendTransaction',
                //   params: [eth_tx],
                // });
                const web3 = init_web3_provider();
                const txReceipt = await web3.eth.sendTransaction(eth_tx);
                console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);
                // notify user the result
                notify('tx commited. open your console page to check txReceipt.', 'success');
                // update return value in the global log state
                await setCallLogs(oldArray => [...oldArray, `call "${item.name}", tx ${txReceipt.transactionHash} commited.`]);
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
                { item.payable  && (
                    <p>
                       <input style={styles.param_input} onChange={hanlePayableValueChange} name={"value_"+item_index} type="text" placeholder="value: ETH" />  
                    </p>
                )}
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
