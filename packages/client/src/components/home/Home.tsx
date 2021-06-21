import React, { useEffect, useRef, useState } from 'react';
import Api from '../../api/index';
import Web3Api from '../../api/web3';
import FreshButton from '../widget/fresh_button';
import NotifyPlace, {notify} from '../widget/notify';
import { MsgSignType  } from '../../types/polyjuice';
import { Grid } from '@material-ui/core';
import common_styles from '../widget/common_style';
import utils from '../../utils/index';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { gruvboxDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { MetaMaskIcon } from '../widget/metamask/icon';
import MetamaskWallet from '../widget/metamask/Wallet';
import ContractDebugger from '../widget/contract-debugger/ContractDebugger';
import config from '../../config/constant.json';
import Web3 from 'web3';
import PolyjuiceHttpProvider from "../../lib/polyjuice_provider.min.js";
import './Home.css';

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
    fontSize: '20px',
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
  },
  descrip_sudt: {
    width: '600px',
    fontSize: '13px',
    margin: '30px auto',
    textAlign: 'left' as const,
  },
  placeholder_for_experimental: {
    width: '700px',
    margin: '0 auto',
    marginTop: '50px',
  }
}
}

export interface EthAccountLockConfig {
  code_hash: string;
  hash_type: 'data' | 'type';
}

function Home() {
  // useScript('../../lib/polyjuice_provider.min.js');
  //const PolyjuiceHttpProvider = window.PolyjuiceHttpProvider;

  const inputFile = useRef<HTMLInputElement>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>();
  
  const [sudtBalance, setSudtBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deployedContracts, setDeployedContracts] = useState<string[]>([]);
  const [rollupTypeHash, setRollupTypeHash] = useState<string>();
  const [ethAccountLockConfig, setEthAccountLockConfig] = useState<EthAccountLockConfig>();
  const [sudtToken, setSudtToken] = useState<string>();
  const [sudtTotalAmount, setSudtTotalAmount] = useState<string>();

  const updateWallet = (new_wallet_addr?: string) => {
    if(new_wallet_addr){
      setSelectedAddress(new_wallet_addr);
    }
  } 

  useEffect(() => {
    if(selectedAddress){
      getSudtBalance();
      getSudtToken();
      getSudtTotalAmount();
    };
    getRollupTypeHash();
    getEthAccountLockConfig();
  }, [selectedAddress]);


  var updateBalance = () => {};

  const init_web3_provider = () => {
    const godwoken_rpc_url = config.web3_server_url;
    const provider_config = {
      godwoken: {
        rollup_type_hash: rollupTypeHash || '',
        eth_account_lock: {
          code_hash: ethAccountLockConfig?.code_hash || '',
          hash_type: ethAccountLockConfig?.hash_type || 'type',
        },
      },
    };
    const provider = new PolyjuiceHttpProvider(
      godwoken_rpc_url,
      provider_config
    );
    var web3 = new Web3(provider);
    return web3;
  }

  const getSudtBalance = async () => {
    if(!selectedAddress)return;
    const api = new Api();
    try {
      const res = await api.getSudtBalance(selectedAddress);
      if(res.status !== 'ok')
        return console.error(`failed to get sudt balance from account. issue sudt token then ${JSON.stringify(res.error)}`);
      await setSudtBalance(utils.shannon2CKB(res.data));
      console.log(utils.shannon2CKB(res.data));
    } catch (error) {
      console.log(`get sudt bablance error`);
      console.log(error);
      notify(JSON.stringify(error));
    }
  }

  const getSudtToken = async () => {
    const api = new Api();
    try {
      const res = await api.getSudtToken();
      console.log(res);
      if(res.status !== 'ok')
        return console.log(`failed to get sudt token. ${JSON.stringify(res.error)}`);

      await setSudtToken(res.data.sudt_token);
    } catch (error) {
      console.log(`get sudt token error`);
      console.log(error);
      notify(JSON.stringify(error));
    } 
  }

  const getSudtTotalAmount = async () => {
    const api = new Api();
    try {
      const res = await api.getSudtTokenTotalAmount();
      console.log(res);
      if(res.status !== 'ok')
        return console.log(`failed to get sudt token. ${JSON.stringify(res.error)}`);

      await setSudtTotalAmount(res.data.total_amount);
    } catch (error) {
      console.log(`get sudt token amount error`);
      console.log(error);
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
      console.log(`get rollup type hash error`);
      console.log(error);
      notify(JSON.stringify(error));
    } 
  }

  const getEthAccountLockConfig = async () => {
    const api = new Api();
    try {
      const res = await api.getEthAccountLockConfig();
      if(res.status !== 'ok')
        return notify(`failed to get eth_account_lock config. ${JSON.stringify(res.error)}`);
      setEthAccountLockConfig(res.data);
    } catch (error) {
      console.log(`get eth account lock error`);
      console.log(error);
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
        updateBalance();
      }else{
        notify(JSON.stringify(res.error));
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  }

 const depositSudt =  async () => {
   if(!selectedAddress)return notify(`metamask account not found.`);
   const api = new Api();
   try {
     const res = await api.deposit_sudt(selectedAddress);
     console.log(res);
     if(res.status === 'ok'){
       notify(`your account id: ${res.data.account_id}`, 'success');
       console.log(`res.data.l2_sudt_script_hash: ${res.data.l2_sudt_script_hash}`)
       await getSudtBalance();
     }else{
       notify(JSON.stringify(res.error));
     }
   } catch (error) {
     notify(JSON.stringify(error));
   }
 }

 const issueToken = async () => {
   const api = new Api();
   try{
     const res = await api.issueToken();
     console.log(res);
     if(res.status === 'ok'){
       notify(`issue a sudt token: ${res.data.sudt_token}`, 'success');
     }else{
       notify(JSON.stringify(res.error, null, 2));
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

    const godwokenWeb3 = new Web3Api();
    const web3 = init_web3_provider(); 
    try {
      const transactionObject = {
        nonce: 0, // ignored by MetaMask
        gasPrice: '0x0000', // customizable by user during MetaMask confirmation.
        gas: '0x9184e72a000', // customizable by user during MetaMask confirmation.
        to: '0x'+'0'.repeat(40), // Required except during contract publications.
        from: window.ethereum.selectedAddress, // must match user's active address.
        value: '0x00', // Only required to send ether to the recipient from the initiating external account.
        data: contractCode, // Optional, but used for defining smart contract creation and interaction.
        chainId: 3, // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
      };
      console.log(transactionObject);
      const txReceipt = await web3.eth.sendTransaction(transactionObject);
      console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);

      const contractAddr = txReceipt.contractAddress; 
      console.log(`contract address: ${contractAddr}`);
      if (!contractAddr)
        return notify(`could not find your contract address in txReceipt: ${txReceipt}`);

      notify(`your contract address: ${contractAddr}`, 'success');
      setDeployedContracts(oldArray => [...oldArray, contractAddr]);
    } catch (error) {
      console.log(error);
      return notify(`could not finished signing process. \n\n ${JSON.stringify(error)}`);
    }
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

  const deployErc20ProxyContract = async () => {
    if(!selectedAddress)return notify(`window.ethereum.selectedAddress not found.`);

    const api = new Api();
    const godwokenWeb3 = new Web3Api();
    try {
      const res: any = await api.deployErc20ProxyContract(selectedAddress); 
      if(res.status !== 'ok')
        notify(JSON.stringify(res.error, null, 2));

      const contract_code_with_constructor = res.data;
      console.log(JSON.stringify(contract_code_with_constructor, null, 2));

      try {
        const transactionObject = {
          nonce: 0, // ignored by MetaMask
          gasPrice: '0x0000', // customizable by user during MetaMask confirmation.
          gas: '0x9184e72a000', // customizable by user during MetaMask confirmation.
          to: '0x'+'0'.repeat(40), // Required except during contract publications.
          from: window.ethereum.selectedAddress, // must match user's active address.
          value: '0x00', // Only required to send ether to the recipient from the initiating external account.
          data: contract_code_with_constructor, // Optional, but used for defining smart contract creation and interaction.
          chainId: 3, // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
        };

        const web3 = init_web3_provider(); 
        const txReceipt = await web3.eth.sendTransaction(transactionObject);
        console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);

        const contractAddr = txReceipt.contractAddress; 
        console.log(`contract address: ${contractAddr}`);
        if (!contractAddr)
          return notify(`could not find your contract address in txReceipt: ${txReceipt}`);

        notify(`your contract address: ${contractAddr}`, 'success');
        setDeployedContracts(oldArray => [...oldArray, contractAddr]);
      } catch (error) {
        console.log(error);
        return notify(`could not finished signing process. \n\n ${JSON.stringify(error)}`);
      }
    } catch (error) {
      notify(JSON.stringify(error));
    } 
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

  const displayShortEthAddress = (eth_address: string) => {
    const length = eth_address.length;
    if(length !== 42){
      return eth_address;
    }

    return eth_address.slice(0,6) + '...' + eth_address.slice(length - 4);
  }

  const displayShortSudtToken = (sudt_token: string | undefined) => {
    if(!sudt_token)
      return 'undefined';

    return sudt_token.slice(0, 6) + '...' + sudt_token.slice(sudt_token.length - 4);
  }

  

const sudt_token_info = `
symbol: MLMC
sudt token: ${ displayShortSudtToken(sudtToken) }
total amount: ${ utils.shannon2CKB(sudtTotalAmount || '') }
decimal places: 8 (same with CKB)
`


  return (
    <div>
      <div className="App">
        <header className="App-header">
          <NotifyPlace />

          <Grid container spacing={3}>
            <Grid item xs={12} style={styles.header}>
              <MetamaskWallet onUpdateWalletAddress={updateWallet} triggerUpdateBalanceMethod={updateBalance} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"Deposit CKB"} onClick={deposit} custom_style={styles.button} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"Deploy ETH Contract"} isLoading={isLoading} onClick={clickUploadContract} custom_style={styles.button} />
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
              Contract Address: 
              <SyntaxHighlighter language="javascript" style={gruvboxDark}>
                {deployedContracts.length > 0 ? deployedContracts.join('\n') : 'nothing.'}
              </SyntaxHighlighter>
            </Grid>
          </Grid>

          <hr />

          <h4> Contract Debugger (experimental) </h4>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <ContractDebugger godwoken_config={ {
                rollup_type_hash: rollupTypeHash,
                eth_account_lock_code_hash: ethAccountLockConfig?.code_hash,
                eth_account_lock_hash_type: ethAccountLockConfig?.hash_type,
              } } />
            </Grid>
          </Grid>
          
          <hr />

          <h4> Sudt Demo Section (experimental) </h4>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={styles.balance}>Balance: <span>{sudtBalance} MLMC </span></div>
            </Grid>
          </Grid>

          <hr></hr>

         <Grid container spacing={5}>
            <Grid item xs={12}>
              <div style={styles.descrip_sudt}>
                <p>below is a simple demo to show how erc20-proxy contract works in godwoken-polyjuice.</p>
                <p>the purpose of erc20-proxy contract is to mount sudt(<a href="https://talk.nervos.org/t/rfc-simple-udt-draft-spec/4333">simple user defined token</a>) in CKB with some sort of ERC20 token in ETH. so you can use ERC20 contract to transfer sudt token in CKB.</p>
                <p>Note:</p>
                <p>you should issue sudt token first if sudt token total amount is 0.</p>
                <p>depositting sudt by defaut will give you 400 sudt each time. and the capacity of ckb required is also 400 ckb, so the balance of your layer2 ckb will also increase. </p>
                <hr />
                <p>How to deploy?</p>
                <p>when you click the third button to deploy erc20-proxy contract, the kicker just retrun an predefined erc20-proxy contract bytecode and assemble an deployed tx for you. after you sign this tx with metamask(using personal sign method), the proxy will be deployed. </p>
                <p>then you can take the contract address and the abi file (you can download from <a href="https://github.com/nervosnetwork/godwoken-polyjuice/blob/main/solidity/erc20/SudtERC20Proxy.abi">here</a>), and interact with the contract through the simple Contract Debugger on kicker.</p>
              </div>
            </Grid>
          </Grid> 

          <Grid container spacing={3}>
            <Grid item xs={12} style={styles.contract_container}>
              <h5>My Little Meow Coin</h5>
              <SyntaxHighlighter language="javascript" style={gruvboxDark}>
                {sudt_token_info}
              </SyntaxHighlighter>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"Issue Sudt Token"} onClick={issueToken} custom_style={styles.button} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"Deposit Sudt"} onClick={depositSudt} custom_style={styles.button} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FreshButton text={"Deploy Erc20-Proxy Contract"} onClick={deployErc20ProxyContract} custom_style={styles.button} />
            </Grid>
          </Grid>

        </header>
      </div>
    </div>
  );
}

export default Home;
