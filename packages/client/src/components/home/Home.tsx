import React, { useEffect, useRef, useState } from 'react';
import './Home.css';
import Api from '../../api/index';
import FreshButton from '../widget/fresh_button';
import NotifyPlace, {notify} from '../widget/notify';
import { MsgSignType  } from '../../types/polyjuice';
import { Button } from '@material-ui/core';

declare global {
  interface Window { ethereum: any; }
}

function Home() {

  const inputFile = useRef<HTMLInputElement>(null);
  const [createCreatorId, setCreateCreator] = useState<string>();
  const [contractCode, setContractCode] = useState<string>();

  useEffect(() => {
    // connect account
    if(window.ethereum){
      window.ethereum.request({ method: 'eth_requestAccounts' });
    }
  }, []);

  const deposit =  async () => {
    const api = new Api();
    try {
      const res = await api.start_polyjuice(window.ethereum.selectedAddress);
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

  const deploy_contract = async () => {
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

  const changeContractCode = async (e: any) => {
    const codefile = e.target.files[0]; 
    const res: any = await read_contract_code(codefile);

    if(res.status === 'ok'){
      const code_hex = res.data;
      console.log(code_hex);
      setContractCode(code_hex);
    }
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
          <FreshButton onClick={start_polyjuice} text={"start polyjuice"} />
         
          <hr />

          <FreshButton onClick={deposit} text={"deposit"} />

          <hr />

          <FreshButton onClick={deploy_contract} text={"deploy contract"} />

          <hr />


          <Button
            variant="contained"
            component="label"
          >
            Upload File
            <input
              type="file"
              ref={inputFile}
              onChange={changeContractCode}
              hidden
            />
          </Button>
        </header>
      </div>
    </div>
  );
}

export default Home;
