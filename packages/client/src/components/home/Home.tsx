import React, { useEffect, useRef, useState } from 'react';
import './Home.css';
import Api from '../../api/index';
import FreshButton from '../widget/fresh_button';
import NotifyPlace, {notify} from '../widget/notify';
import { MsgSignType  } from '../../types/polyjuice';
import { Grid } from '@material-ui/core';
import common_styles from '../widget/common_style';
import utils from '../../utils/index';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { gruvboxDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

declare global {
  interface Window { ethereum: any; }
}

const styles = {...common_styles, ...{
  header: {
    minHeight: '300px',
    margin: '10px',
  },
  address: {
    color: '#a0eec0',
  },
  balance: {
    color: 'whitesmoke',
  },
  button: {
    fontSize: '25px',
    width: '100%',
    maxWidth: '700px',
    margin: '10px',
    padding: '0.7rem 1.2rem',
  },
  contract_container: {
    width: '100%',
    maxWidth: '700px',
    margin: '30px auto',
    textAlign: 'left' as const,
    fontSize: '15px',
    border: '1px solid gray',
    color: 'gray',
  },
  contract_li: {
    listStyleType: 'none' as const,
  }
}
}

function Home() {
  const inputFile = useRef<HTMLInputElement>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>();
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deployedContracts, setDeployedContracts] = useState<string[]>([]);
  const [rollupTypeHash, setRollupTypeHash] = useState<string>();

  useEffect(() => {
    // connect account
    if(window.ethereum){
      window.ethereum.request({ method: 'eth_requestAccounts' });
      setSelectedAddress(window.ethereum.selectedAddress);
    };
    getRollupTypeHash();
  }, []);

  useEffect(() => {
    if(selectedAddress){
      getBalance();
    };
  }, [selectedAddress]);

  // detect metamask account changes.
  window.ethereum.on('accountsChanged', function (accounts: any) {
    setSelectedAddress(accounts[0]);
  });

  const getBalance = async () => {
    if(!selectedAddress)return;
    const api = new Api();
    try {
      const res = await api.getBalance(selectedAddress);
      if(res.status !== 'ok')
        return notify(`failed to get balance from account. ${JSON.stringify(res.error)}`);
      setBalance(utils.shannon2CKB(res.data));
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

  const getRollupTypeHash = async () => {
    const api = new Api();
    try {
      const res = await api.getRollupTypeHash();
      if(res.status !== 'ok')
        return notify(`failed to get rollup type hash. ${JSON.stringify(res.error)}`);
      setRollupTypeHash(res.data);
    } catch (error) {
      notify(JSON.stringify(error));
    } 
  }

  const deposit =  async () => {
    if(!selectedAddress)return notify(`metamask account not found.`);
    const api = new Api();
    try {
      const res = await api.deposit(selectedAddress);
      console.log(res);
      if(res.status === 'ok'){
        notify(`your account id: ${res.data.account_id}`, 'success');
        getBalance();
      }else{
        notify(JSON.stringify(res.error));
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

    // const transfer = async () => {
    //     if(!selectedAddress)return notify(`metamask account not found.`);
    //     const api = new Api();
    //     try {
    //         /* FIXME: get those fields from form instead */
    //         const to_id = '1'; /* CKB token sudt_id account */
    //         const amount = '500';
    //         const fee = '50';
    //         const res = await api.transfer(window.ethereum.selectedAddress);
    //         if(res.status !== 'ok')return notify(JSON.stringify(res));

    //         const data: MsgSignType = res.data;
    //         var signature;
    //         try {
    //             signature = await window.ethereum.request({
    //                 method: 'personal_sign',
    //                 params: [data.message, window.ethereum.selectedAddress],
    //             });
    //         } catch (error) {
    //             console.log(error);
    //             return notify(`could not finished signing process. \n\n ${JSON.stringify(error)}`);
    //         }

    //         // submit the signed tx to godwoken
    //         const tx_res = await api.sendL2Transaction(data.raw_l2tx, signature, data.type, data.l2_script_args);
    //         if(tx_res.status !== 'ok'){
    //             console.log(tx_res);
    //             return notify(JSON.stringify(tx_res.error));
    //         }
    //         notify('transfer success', 'success');
    //     } catch (error) {
    //         notify(JSON.stringify(error));
    //     }
    // }

  const clickUploadContract = async () => {
    if(!inputFile)return notify(`input ref not found.`);
    inputFile.current!.click();
  } 

  const _deployContract = async (contractCode: string) => {
    if(!contractCode)return notify(`upload contract binary file first!`);
    if(!selectedAddress)return notify(`window.ethereum.selectedAddress not found.`);

    const api = new Api();
    try {
      const res = await api.deployContract(contractCode, window.ethereum.selectedAddress);
      if(res.status !== 'ok')return notify(JSON.stringify(res));

      const data: MsgSignType = res.data;
      console.log(JSON.stringify(data, null, 2));
      var signature;
      try {
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [data.message, window.ethereum.selectedAddress],
        }); 
      } catch (error) {
        console.log(error);
        return notify(`could not finished signing process. \n\n ${JSON.stringify(error)}`);
      }

      console.log(`messageL ${data.message}`);
      console.log(`signature: ${signature}`);

      // submit the signed tx to godwoken
      const tx_res = await api.sendL2Transaction(data.raw_l2tx, signature, data.type, data.l2_script_args);
      if(tx_res.status !== 'ok'){
        console.log(tx_res);
        return notify(JSON.stringify(tx_res.error));
      }

      console.log(tx_res.data);
      notify(`your contract address: ${tx_res.data.contract_address}`, 'success');
      setDeployedContracts(oldArray => [...oldArray, tx_res.data.contract_address]);
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

  const test_sig = async () => {
    const message = "0x33145551813ccd1abc9b6de9abab432103925399378a779240ff4cd40bf7a242";
    let signature;
    try {
      signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, window.ethereum.selectedAddress],
      }); 
    } catch (error) {
      console.log(error);
      return notify(`could not finished signing process. \n\n ${JSON.stringify(error)}`);
    }
    let v = Number.parseInt(signature.slice(-2), 16);
    if (v >= 27) v -= 27;
    signature = signature.slice(0, -2) + v.toString(16).padStart(2, "0");

    console.log(`messageL ${message}`);
    console.log(`signature: ${signature}`);
  }

  const deployContract = async (e: any) => {
    const codefile = e.target.files[0]; 
    setIsLoading(true);
    const res: any = await readContractCode(codefile);
    if(res.status !== 'ok'){
      setIsLoading(false);
      return notify(`can not read contract code from file.`);
    };

    const code_hex = res.data;
    console.log('reading contract code hex:');
    console.log(code_hex);
    await _deployContract(code_hex);
    setIsLoading(false);
  }

  const readContractCode = (codefile: Blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event: any) => {
            const code_hex = `0x${event.target.result}`;
            resolve({status:'ok', data: code_hex});
        };
        reader.onerror = (err) => {
            resolve({status:'failed', error: err});
        };
        reader.onabort = () => {
          resolve({status:'failed', error: 'user abort.'});
        }
        reader.readAsBinaryString(codefile);
    });  
  } 

  const web3CodeString = `
  const godwoken_rpc_url = 'http://127.0.0.1:8119';
  const provider_config =  {
    godwoken: {
        rollup_type_hash: "${rollupTypeHash}",
        layer2_lock: {
            code_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
            hash_type: "data"
        }
    }
  }
  const provider = new PolyjuiceHttpProvider(godwoken_rpc_url, provider_config);
  const web3 = new Web3(provider);
                  `

  return (
    <div>
      <div className="App">
        <header className="App-header">
          <NotifyPlace />
          <Grid container spacing={3}>
            <Grid item xs={12} style={styles.header}>
              <h3> {selectedAddress} </h3>
              <div><span style={styles.balance}>{balance} CKB </span></div>
            </Grid>
          </Grid>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"test"} onClick={test_sig} custom_style={styles.button} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"Deposit"} onClick={deposit} custom_style={styles.button} />
            </Grid>
          </Grid>



          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"Deploy Contract"} isLoading={isLoading} onClick={clickUploadContract} custom_style={styles.button} />
              <input
                  type="file"
                  ref={inputFile}
                  onChange={deployContract}
                  hidden
              />
            </Grid>
          </Grid>

          <hr></hr>

          <Grid container spacing={3}>
            <Grid item xs={12} style={styles.contract_container}>

              Web3.js init code: 
              <SyntaxHighlighter language="javascript" style={gruvboxDark}>
                {web3CodeString}
              </SyntaxHighlighter>

              Contract Address: 
              <SyntaxHighlighter language="javascript" style={gruvboxDark}>
                {deployedContracts.join('\n')}
              </SyntaxHighlighter>

            </Grid>
          </Grid>
        </header>
      </div>
    </div>
  );
}

export default Home;
