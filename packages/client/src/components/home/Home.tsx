import React, { useEffect, useRef, useState } from 'react';
import './Home.css';
import Api from '../../api/index';
import FreshButton from '../widget/fresh_button';
import NotifyPlace, {notify} from '../widget/notify';
import { MsgSignType  } from '../../types/polyjuice';
import { Button, Grid } from '@material-ui/core';
import common_styles from '../widget/common_style';
import utils from '../../utils/index';

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
  leftSection: {
    padding: '10px',
    width: '100%',
    minHeight: '500px',
    background: '#666b6a',
    fontSize: '18px',
    cursor: 'pointer' as const,
  },
  rightSection: {
    padding: '10px',
    width: '100%',
    minHeight: '500px',
    background: '#88ccf1',
    cursor: 'pointer' as const,
  },
  button: {
    padding: '6px 16px',
    fontSize: '0.875rem',
    minWidth: '64px',
    boxSizing: 'border-box' as const,
    border: '0',
    color: 'rgba(0, 0, 0, 0.87)',
    boxShadow: '0px 3px 1px -2px rgb(0 0 0 / 20%), 0px 2px 2px 0px rgb(0 0 0 / 14%), 0px 1px 5px 0px rgb(0 0 0 / 12%)',
    backgroundColor: '#e0e0e0',
  }
}

}

function Home() {
  const inputFile = useRef<HTMLInputElement>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const [createCreatorId, setCreateCreator] = useState<string>();

  useEffect(() => {
    // connect account
    if(window.ethereum){
      window.ethereum.request({ method: 'eth_requestAccounts' });
      setSelectedAddress(window.ethereum.selectedAddress);
    }
  }, []);

  useEffect(() => {
    if(selectedAddress){
      getBalance();
    }

  }, [selectedAddress]);

  window.ethereum.on('accountsChanged', function (accounts: any) {
    // Time to reload your interface with accounts[0]!
    setSelectedAddress(window.ethereum.selectedAddress);
  });

  const getBalance = async () => {
    if(!selectedAddress)return;

    const api = new Api();
    try {
      const res = await api.getBalance(selectedAddress);
      console.log(res);
      if(res.status !== 'ok')return notify(JSON.stringify(res.error));
      setBalance(utils.shannon2CKB(res.data));
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

  const deposit =  async () => {
    const api = new Api();
    try {
      const res = await api.deposit(window.ethereum.selectedAddress);
      console.log(res);
      if(res.status === 'ok'){
        notify(res.data.account_id, 'success');
      }else{
        notify(JSON.stringify(res.error));
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

  // deposit and createCreator.
  const start_polyjuice =  async () => {
    const api = new Api();
    try {
      const res = await api.start_polyjuice(window.ethereum.selectedAddress);
      console.log(res);
      if(res.status === 'ok'){
        const data: MsgSignType = res.data;
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [data.message, window.ethereum.selectedAddress],
        });
        // submit the signed tx to godwoken
        // todo: catch user cancel metamask signing process.
        const tx_res = await api.send_l2_tx(data.raw_l2tx, signature, data.type);
        if(tx_res.status === 'ok'){
          console.log(tx_res.data);
          notify(tx_res.data.account_id, 'success');
          setCreateCreator(tx_res.data.account_id);
        }else{
          console.log(tx_res);
          notify(JSON.stringify(tx_res.error));
        }
      }else{
        notify(JSON.stringify(res.error));
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

  const deploy_contract = async (contractCode: string) => {
    if(!contractCode)return notify(`upload contract binary file first!`);
    if(!window.ethereum.selectedAddress)return notify(`window.ethereum.selectedAddress not found.`);

    const api = new Api();
    try {
      const res = await api.deploy_contract(contractCode, window.ethereum.selectedAddress);
      if(res.status !== 'ok')return notify(JSON.stringify(res));

      const data: MsgSignType = res.data;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [data.message, window.ethereum.selectedAddress],
      });
      // submit the signed tx to godwoken
      // todo: catch user cancel metamask signing process.
      const tx_res = await api.send_l2_tx(data.raw_l2tx, signature, data.type, data.l2_script_args);
      if(tx_res.status !== 'ok'){
        console.log(tx_res);
        return notify(JSON.stringify(tx_res.error));
      }

      console.log(tx_res.data);
      notify(tx_res.data.account_id, 'success');
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

  const deployContractCode = async (e: any) => {
    const codefile = e.target.files[0]; 
    const res: any = await read_contract_code(codefile);
    if(res.status !== 'ok')return notify(`can not read contract code from file.`);

    const code_hex = res.data;
    console.log(code_hex);
    await deploy_contract(code_hex);
  }

  const read_contract_code = (codefile: Blob) => {
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

  return (
    <div>
      <div className="App">
        <header className="App-header">
          <NotifyPlace />
          <Grid container spacing={3}>
            <Grid item xs={12} style={styles.header}>
              <h3> {selectedAddress} </h3>
              <div><span>{balance} CKB </span></div>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={6} className="big-left-btn" onClick={deposit}>
              Deposit to Metamask Address
            </Grid>
            <Grid item xs={6} className="big-right-btn"> 
                Deploy Smart Contract 
                <input
                  type="file"
                  ref={inputFile}
                  onChange={deployContractCode}
                  
                />
            </Grid>
          </Grid>
        </header>
      </div>
    </div>
  );
}

export default Home;
