import React, { useEffect, useRef, useState } from 'react';
import './Home.css';
import Api from '../../api/index';
import FreshButton from '../widget/fresh_button';
import NotifyPlace, {notify} from '../widget/notify';
import { MsgSignType  } from '../../types/polyjuice';
import { Grid } from '@material-ui/core';
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
  balance: {
    color: 'whitesmoke',
  },
  button: {
    fontSize: '25px',
    width: '100%',
    maxWidth: '600px',
    margin: '10px',
  }
}
}

function Home() {
  const inputFile = useRef<HTMLInputElement>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>();
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const deposit =  async () => {
    if(!selectedAddress)return notify(`metamask account not found.`);
    const api = new Api();
    try {
      const res = await api.deposit(selectedAddress);
      console.log(res);
      if(res.status === 'ok'){
        notify(res.data.account_id, 'success');
        getBalance();
      }else{
        notify(JSON.stringify(res.error));
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

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
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [data.message, window.ethereum.selectedAddress],
      });
      // submit the signed tx to godwoken
      // todo: catch user cancel metamask signing process.
      const tx_res = await api.sendL2Transaction(data.raw_l2tx, signature, data.type, data.l2_script_args);
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

  const deployContract = async (e: any) => {
    const codefile = e.target.files[0]; 
    setIsLoading(true);
    const res: any = await readContractCode(codefile);
    if(res.status !== 'ok'){
      setIsLoading(false);
      return notify(`can not read contract code from file.`)
    };

    const code_hex = res.data;
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
        </header>
      </div>
    </div>
  );
}

export default Home;
