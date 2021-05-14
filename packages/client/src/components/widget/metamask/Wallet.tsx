import React, { useEffect, useState } from 'react';
import { MetaMaskIcon } from './icon'
import MetaMaskOnboarding from '@metamask/onboarding';
import { notify } from '../notify';
import { chain_id } from '../../../config/constant.json';
import FreshButton from '../fresh_button';

export type WalletStatus = 
   | 'connect-failed' // metamask account status... 
   | 'diconnect' // metamask account status... 
   | 'connected'
   | 'not-installed' 
   | 'installed'
  
export interface WalletProps {
  onUpdateWalletAddress?: (wallet_addr: string | undefined) => void
}

export default function Wallet (props: WalletProps) {

    const { onUpdateWalletAddress } = props;

    const [selectedAddress, setSelectedAddress] = useState<string>();
    const [metamaskStatus, setMetamaskStatus] = useState<WalletStatus>();
    const [chainIdStatus, setChainIdStatus] = useState<boolean>();
    const [networkStatus, setNetworkStatus] = useState<boolean>(true);

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
          if(current_chain_id !== chain_id){
            console.error(`current chain id not equals ${current_chain_id} !== polyjuice chain id ${chain_id}`);
            await setChainIdStatus(false);
            notify('wrong network!');
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

    useEffect( () => {
        init();
    }, []);

    useEffect( () => {
      if(onUpdateWalletAddress)
        onUpdateWalletAddress(selectedAddress);
        
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
            <FreshButton 
              custom_style={{width: '300px', height: '45px', fontSize: '20px', margin: '5px' }}
              text={ 'Wallet: ' + displayShortEthAddress(selectedAddress ? selectedAddress : 'Connect') } 
              onClick={ selectedAddress ? function(){} : connectMetamask } />
            <div style={{fontSize: '18px', color: 'gray'}}>
              <span style = {{marginRight: '10px'}}>
                <MetaMaskIcon />  {metamaskStatus}
              </span>
              <span style={{marginRight: '10px'}}>
                Polyjuice Network: { chainIdStatus ? '☑️' : '✖️' } 
              </span>
              <span>Network Status: { networkStatus ? 'connected' : 'disconnected'} </span>
            </div>
        </div>
    )
}
