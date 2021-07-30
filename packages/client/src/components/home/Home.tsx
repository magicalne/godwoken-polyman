import React, { useEffect, useState } from "react";
import Api from "../../api/index";
import NotifyPlace, { notify } from "../widget/notify";
import { Grid } from "@material-ui/core";
import common_styles from "../widget/common_style";
import MetamaskWallet from "../widget/metamask/Wallet";
import "./Home.css";
import SimpleTabs from "../widget/tabs/simpleTabs";
import ChainInfo, { EthAccountLockConfig } from "../widget/chainInfo/ChainInfo";
import Accounts from "../widget/features/accounts";
import Contracts from "../widget/features/contracts";
import Erc20ProxyDemo from "../widget/features/erc20ProxyDemo";
import BgBanner from "../../resource/bg-banner.jpeg";

declare global {
  interface Window {
    ethereum: any;
  }
}

const styles = {
  ...common_styles,
  ...{
    header: {
      minHeight: "300px",
      //backgroundImage: "url('"+ BgBanner + "')"
    },
    address: {
      color: "#a0eec0",
    },
    balance: {
      color: "whitesmoke",
      fontSize: "20px",
    },
    button: {
      fontSize: "25px",
      width: "100%",
      maxWidth: "700px",
      margin: "10px",
      padding: "0.7rem 1.2rem",
      color: "black",
    },
    contract_container: {
      width: "100%",
      maxWidth: "700px",
      margin: "30px auto",
      textAlign: "left" as const,
      fontSize: "15px",
      border: "1px solid gray",
      color: "gray",
    },
    contract_li: {
      listStyleType: "none" as const,
    },
    descrip_sudt: {
      width: "600px",
      fontSize: "13px",
      margin: "30px auto",
      textAlign: "left" as const,
    },
    placeholder_for_experimental: {
      width: "700px",
      margin: "0 auto",
      marginTop: "50px",
    },
  },
};

function Home() {
  const [selectedAddress, setSelectedAddress] = useState<string>();

  const [rollupTypeHash, setRollupTypeHash] = useState<string>();
  const [ethAccountLockConfig, setEthAccountLockConfig] =
    useState<EthAccountLockConfig>();
  const [updateBalanceTrigger, setUpdateBalanceTrigger] = useState<number>(0);

  const updateWallet = (new_wallet_addr?: string) => {
    if (new_wallet_addr) {
      setSelectedAddress(new_wallet_addr);
    }
  };

  useEffect(() => {
    getRollupTypeHash();
    getEthAccountLockConfig();
  }, []);

  const getRollupTypeHash = async () => {
    const api = new Api();
    try {
      const res = await api.getRollupTypeHash();
      if (res.status !== "ok")
        return notify(
          `failed to get rollup type hash. ${JSON.stringify(res.error)}`
        );
      setRollupTypeHash(res.data);
    } catch (error) {
      console.log(`get rollup type hash error`);
      console.log(error);
      notify(JSON.stringify(error));
    }
  };

  const getEthAccountLockConfig = async () => {
    const api = new Api();
    try {
      const res = await api.getEthAccountLockConfig();
      if (res.status !== "ok")
        return notify(
          `failed to get eth_account_lock config. ${JSON.stringify(res.error)}`
        );
      setEthAccountLockConfig(res.data);
    } catch (error) {
      console.log(`get eth account lock error`);
      console.log(error);
      notify(JSON.stringify(error));
    }
  };

  const tabsContent = [
    <ChainInfo />,
    <Accounts addressVec={[selectedAddress]} />,
    <Contracts
      selectedAddress={selectedAddress}
      rollupTypeHash={rollupTypeHash}
      ethAccountLockConfig={ethAccountLockConfig}
    />,
    <Erc20ProxyDemo
      selectedAddress={selectedAddress}
      rollupTypeHash={rollupTypeHash}
      ethAccountLockConfig={ethAccountLockConfig}
    />,
  ];

  const tabsNames = ["chain Info", "Accounts", "Contract", "Erc20 Proxy Demo"];

  return (
    <div>
      <div className="App">
        <header className="App-header">
          <NotifyPlace />

          <Grid container>
            <Grid item xs={12} style={styles.header} spacing={3}>
              <MetamaskWallet
                onUpdateWalletAddress={updateWallet}
                updateBalanceTrigger={updateBalanceTrigger}
              />
            </Grid>
            <Grid item xs={12} spacing={3}>
              <SimpleTabs names={tabsNames} tabs={tabsContent} />
            </Grid>
          </Grid>
        </header>
      </div>
    </div>
  );
}

export default Home;
