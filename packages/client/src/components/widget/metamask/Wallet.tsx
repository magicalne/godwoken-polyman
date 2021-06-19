import React, { useEffect, useState } from 'react';
import { MetaMaskIcon } from './icon'
import MetaMaskOnboarding from '@metamask/onboarding';
import { notify } from '../notify';
import FreshButton from '../fresh_button';
import NetworkCheckIcon from '@material-ui/icons/NetworkCheck';
import LinkIcon from '@material-ui/icons/Link';
import LinkOffIcon from '@material-ui/icons/LinkOff';
import Web3Api from '../../../api/web3';
import Api from '../../../api/index';
import utils from '../../../utils/index';

const styles = {
  wallet_container: {
    maxWidth: '300px',
    maxHeigth: '20px',
    margin: '40px auto',
    display: 'flex' as const,
    padding: '5px',
    alignItems: 'center' as const,
    borderRadius: '30px',
    justifyContent: 'center',
    backgroundColor: 'rgb(60, 198, 138)',
  },
  status: {
    fontSize: '18px', 
    color: 'gray',
    margin: '20px',
  },
  status_item: {
    boder: '1px solid gray',
    padding: '5px',
    marginRight: '10px',
  },
  balance: {
    color: 'whitesmoke',
    fontSize: '20px',
  },
  dark_green: {
    color: '#065a06'
  }
}

export type WalletStatus = 
   | 'connect-failed' // metamask account status
   | 'diconnect' // metamask account status 
   | 'connected' // metamask account status
   | 'not-installed' 
   | 'installed'
  
export interface WalletProps {
  onUpdateWalletAddress?: (wallet_addr: string | undefined) => void
  triggerUpdateBalanceMethod?: () => void
}

export default function Wallet (props: WalletProps) {

    const { onUpdateWalletAddress } = props;
    var { triggerUpdateBalanceMethod: getBalanceMethod } = props;

    const [selectedAddress, setSelectedAddress] = useState<string>();
    const [metamaskStatus, setMetamaskStatus] = useState<WalletStatus>();
    const [chainIdStatus, setChainIdStatus] = useState<boolean>();
    const [networkStatus, setNetworkStatus] = useState<boolean>(true); // todo: remove initail value
    const [balance, setBalance] = useState<string>('0');

    const WrongChainTips = <span style={{color: 'red'}}> <LinkOffIcon />  wrong network </span>
    const RightChainTips = <span style={{color: styles.dark_green.color}}> <LinkIcon /> Polyjucie ☑️ </span> 
    const DisconnectedNetworkTips = <span style={{color: 'red'}}> <NetworkCheckIcon></NetworkCheckIcon> Disconnected </span>
    const ConnectedNetworkTips = <span style={{color: styles.dark_green.color}}> <NetworkCheckIcon></NetworkCheckIcon> Connected </span> 

    const init = async () => {
        if( !isMetaMaskOnborad() ){
            notify("please install MetaMask!");
            throw new Error("please install MetaMask!");
        }

        console.log(window.ethereum.isConnected());

        if( window.ethereum.isConnected() ){
          console.log('is conneted...')
          setNetworkStatus(true);
        }

        await checkChainIdIsOk();

        listenForChainIdChanged();
        listenForAccountChanged();
        listenForNetworkChanged();

        connectMetamask();
    }

    const getProvider = () => {
        return window.ethereum;   
    }

    const isMetaMaskOnborad = async () => {
      if (MetaMaskOnboarding.isMetaMaskInstalled()) {
        await setMetamaskStatus('installed');
        return true;
      }else{
        await setMetamaskStatus('not-installed');
        return false;
      }
    }

    const checkChainIdIsOk = async () => {
        try {
          const current_chain_id = await window.ethereum.request({ method: 'eth_chainId' });
          console.log(`current chain id: ${current_chain_id}`);
          const api = new Api(); 
          const res = await api.getChainId();
          console.log(res);
          const chain_id = res.data;
          if(current_chain_id !== chain_id){
            console.error(`current chain id not equals ${current_chain_id} !== polyjuice chain id ${chain_id}`);
            await setChainIdStatus(false);
//            notify('wrong network!');
            return false
          }
          await setChainIdStatus(true);
          return true;
        } catch (error) {
          notify(JSON.stringify(error, null, 2));
          return false;
        }
    }

    const listenForChainIdChanged = () => {
        window.ethereum.on('chainChanged', handleChainChanged);
        function handleChainChanged(_chainId: string) {
          console.log('chain_id changed!');
          window.location.reload();
        }
    }

    const listenForAccountChanged = () => {
      window.ethereum.on('accountsChanged', handleAccountChanged);
      function handleAccountChanged(account: string) {
        if(account.length > 0)
          setSelectedAddress(account[0]);
        else{
          setSelectedAddress(undefined);
          setMetamaskStatus('diconnect');
          notify('please reconnect to metamask!');
        }
      } 
    }

    // todo: the connect event seems not emit forever
    const listenForNetworkChanged = () => {
      window.ethereum.on('connect', handleConnect);
      function handleConnect() {
        console.log('connect!!!');
        setNetworkStatus(true);
      } 

      window.ethereum.on('disconnect', handleDisconnect);
      function handleDisconnect() {
        setNetworkStatus(false);
      } 
    }

    const connectMetamask = async () => {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setMetamaskStatus('connected');
        setSelectedAddress(window.ethereum.selectedAddress);
      } catch (error) {
        notify(JSON.stringify(error, null, 2));
        setMetamaskStatus('connect-failed');
        console.error(error);
      }
    }

    const getBalance = async () => {
      if(!selectedAddress)return;
      const web3Api = new Web3Api(); 
      try {
        console.log(selectedAddress);
        const data = await web3Api.getBalance(selectedAddress);
        console.log(data);
        if(!data)
          return console.log(`balance is undefinded.`);
          
        const balance = BigInt(data).toString();
        console.log(balance);
        await setBalance(utils.shannon2CKB(balance));
        console.log(utils.shannon2CKB(balance));
      } catch (error) {
        console.log(`get bablance error`);
        console.log(error);
        notify(JSON.stringify(error));
      }
    }

    const toEthBalance = (ckb_balance: string) => {
      const ckb = parseFloat(ckb_balance);
      const eth = ckb / parseFloat('10000000000');
      if(eth > 0)
        return eth.toFixed(10 - ckb_balance.length + 1);
      else
        return eth.toFixed(2);
    }

    useEffect( () => {
        if(getBalanceMethod){
          // todo: this is tricky
          getBalanceMethod = () => {
            getBalance();
          }
        }
        init();
        getBalance();
    }, []);

    useEffect( () => {
      if(onUpdateWalletAddress)
        onUpdateWalletAddress(selectedAddress);
      
      getBalance();
    }, [selectedAddress] );

    const displayShortEthAddress = (eth_address: string) => {
      const length = eth_address.length;
      if(length !== 42){
        return eth_address;
      }
      return eth_address.slice(0,8) + '...' + eth_address.slice(length - 6);
    }

    return(
        <div>
          <div style={styles.wallet_container}>
            <MetaMaskIcon />
            <FreshButton 
              custom_style={{fontSize: '25px', fontWeight: 'bolder', border: 'none' }}
              text={ displayShortEthAddress(selectedAddress ? selectedAddress : 'Connect Wallet') } 
              onClick={ selectedAddress ? function(){} : connectMetamask } />
          </div>
{/*       <div style={styles.status}>
            <span style={styles.status_item}>
              { chainIdStatus ? RightChainTips : WrongChainTips }
            </span>
            <span style={styles.status_item}> 
              { networkStatus ?  ConnectedNetworkTips : DisconnectedNetworkTips }
            </span>
          </div>
*/}
          <div>
            <div style={styles.balance}> <span>{balance} CKB ( {toEthBalance(balance)}  pETH )</span></div>
          </div>
        </div>
    )
}
