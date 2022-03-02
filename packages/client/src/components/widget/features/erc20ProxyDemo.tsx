import { Divider, Grid, Typography } from "@material-ui/core";
import {
  PolyjuiceConfig,
} from "@polyjuice-provider/base"
import PolyjuiceHttpProvider from "@polyjuice-provider/web3";
import config from "../../../config/constant.json";
import React, { useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { gruvboxDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Web3 from "web3";
import Api from "../../../api";
import common_styles from "../common_style";
import FreshButton from "../fresh_button";
import { notify } from "../notify";
import utils from "../../../utils/index";
import { EthAccountLockConfig } from "../chainInfo/ChainInfo";

const styles = {
  ...common_styles,
  ...{
    header: {
      minHeight: "300px",
      margin: "10px",
    },
    address: {
      color: "#a0eec0",
    },
    balance: {
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

export interface Erc20ProxyDemoProps {
  selectedAddress: string | undefined;
  rollupTypeHash: string | undefined;
  ethAccountLockConfig: EthAccountLockConfig | undefined;
}

export default function Erc20ProxyDemo(props: Erc20ProxyDemoProps) {
  const { selectedAddress, rollupTypeHash, ethAccountLockConfig } = props;
  const [sudtBalance, setSudtBalance] = useState<string>("0");
  const [sudtToken, setSudtToken] = useState<string>();
  const [sudtTotalAmount, setSudtTotalAmount] = useState<string>();
  const [erc20ProxyContractAddress, setErc20ProxyContractAddress] =
    useState<string>("");

  useEffect(() => {
    if (selectedAddress) {
      getSudtBalance();
      getSudtToken();
      getSudtTotalAmount();
    }
  }, [selectedAddress]);

  const init_web3_provider = () => {
    const godwoken_web3_rpc_url = config.web3_server_url.devnet;
    const provider_config: PolyjuiceConfig = {
      web3Url: godwoken_web3_rpc_url,
    };
    const provider = new PolyjuiceHttpProvider(
      godwoken_web3_rpc_url,
      provider_config
    );
    var web3 = new Web3(provider);
    return web3;
  };
  const getSudtBalance = async () => {
    if (!selectedAddress) return;
    const api = new Api();
    try {
      const res = await api.getSudtBalance(selectedAddress);
      if (res.status !== "ok")
        return console.error(
          `failed to get sudt balance from account. issue sudt token then ${JSON.stringify(
            res.error
          )}`
        );
      await setSudtBalance(utils.shannon2CKB(res.data));
      console.log(utils.shannon2CKB(res.data));
    } catch (error) {
      console.log(`get sudt bablance error`);
      console.log(error);
      notify(JSON.stringify(error));
    }
  };

  const getSudtToken = async () => {
    const api = new Api();
    try {
      const res = await api.getSudtToken();
      console.log(res);
      if (res.status !== "ok")
        return console.log(
          `failed to get sudt token. ${JSON.stringify(res.error)}`
        );

      await setSudtToken(res.data.sudt_token);
    } catch (error) {
      console.log(`get sudt token error`);
      console.log(error);
      notify(JSON.stringify(error));
    }
  };

  const getSudtTotalAmount = async () => {
    const api = new Api();
    try {
      const res = await api.getSudtTokenTotalAmount();
      console.log(res);
      if (res.status !== "ok")
        return console.log(
          `failed to get sudt token. ${JSON.stringify(res.error)}`
        );

      await setSudtTotalAmount(res.data.total_amount);
    } catch (error) {
      console.log(`get sudt token amount error`);
      console.log(error);
      notify(JSON.stringify(error));
    }
  };

  const depositSudt = async () => {
    if (!selectedAddress) return notify(`metamask account not found.`);
    const api = new Api();
    try {
      const res = await api.deposit_sudt(selectedAddress);
      console.log(res);
      if (res.status === "ok") {
        notify(`your account id: ${res.data.account_id}`, "success");
        console.log(
          `res.data.l2_sudt_script_hash: ${res.data.l2_sudt_script_hash}`
        );
        await getSudtBalance();
      } else {
        notify(JSON.stringify(res.error));
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  };

  const issueToken = async () => {
    const api = new Api();
    try {
      const res = await api.issueToken();
      console.log(res);
      if (res.status === "ok") {
        notify(`issue a sudt token: ${res.data.sudt_token}`, "success");
      } else {
        notify(JSON.stringify(res.error, null, 2));
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  };

  const deployErc20ProxyContract = async () => {
    if (!selectedAddress)
      return notify(`window.ethereum.selectedAddress not found.`);

    const api = new Api();
    try {
      const res: any = await api.deployErc20ProxyContract(selectedAddress);
      if (res.status !== "ok") notify(JSON.stringify(res.error, null, 2));

      const contract_code_with_constructor = res.data;
      console.log(JSON.stringify(contract_code_with_constructor, null, 2));

      try {
        const transactionObject = {
          gasPrice: "0x0000", // customizable by user during MetaMask confirmation.
          gas: "0x9184e72a000", // customizable by user during MetaMask confirmation.
          from: window.ethereum.selectedAddress, // must match user's active address.
          value: "0x00", // Only required to send ether to the recipient from the initiating external account.
          data: contract_code_with_constructor, // Optional, but used for defining smart contract creation and interaction.
        };

        const web3 = init_web3_provider();
        const txReceipt = await web3.eth.sendTransaction(transactionObject);
        console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);

        const contractAddr = txReceipt.contractAddress;
        console.log(`contract address: ${contractAddr}`);
        if (!contractAddr)
          return notify(
            `could not find your contract address in txReceipt: ${txReceipt}`
          );

        notify(`your contract address: ${contractAddr}`, "success");
        setErc20ProxyContractAddress(contractAddr);
      } catch (error: any) {
        console.log(error);
        return notify(
          `could not finished signing process. \n\n ${JSON.stringify(error.message)}`
        );
      }
    } catch (error) {
      notify(JSON.stringify(error));
    }
  };

  const displayShortSudtToken = (sudt_token: string | undefined) => {
    if (!sudt_token) return "undefined";

    return (
      sudt_token.slice(0, 6) + "..." + sudt_token.slice(sudt_token.length - 4)
    );
  };

  const sudt_token_info = `
symbol: MLMC
sudt token: ${displayShortSudtToken(sudtToken)}
total amount: ${utils.shannon2CKB(sudtTotalAmount || "")}
decimal places: 8 (same with CKB)
`;

  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" >Erc20-Sudt Proxy Demo</Typography>
        </Grid>
      </Grid>

      <Grid container spacing={5}>
        <Grid item xs={12}>
          <div style={styles.descrip_sudt}>
            <p>
              below is a simple demo to show how erc20-proxy contract works in
              godwoken-polyjuice.
            </p>
            <p>
              the purpose of erc20-proxy contract is to mount sudt(
              <a href="https://talk.nervos.org/t/rfc-simple-udt-draft-spec/4333">
                simple user defined token
              </a>
              ) in CKB with some sort of ERC20 token interface in Ethereum. so you can use
              ERC20 contract to transfer sudt token in CKB.
            </p>
            <p>Note:</p>
            <p>
              you should issue sudt token first if sudt token total amount is 0.
            </p>
            <p>
              depositting sudt by defaut will give you 400 sudt each time. and
              the capacity of ckb required is also 400 ckb, so the balance of
              your layer2 ckb will also increase.{" "}
            </p>
            <hr />
            <p>How to deploy?</p>
            <p>
              when you click the third button to deploy erc20-proxy contract,
              the kicker just return an predefined erc20-proxy contract bytecode
              and assemble an deployed tx for you. after you sign this tx with
              metamask(using personal sign method), the proxy will be deployed.{" "}
            </p>
            <p>
              then you can take the contract address and the abi file (you can
              download from{" "}
              <a href="https://github.com/nervosnetwork/godwoken-polyjuice/blob/main/solidity/erc20/SudtERC20Proxy.abi">
                here
              </a>
              ), and interact with the contract through the simple Contract
              Debugger on kicker.
            </p>
          </div>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <div style={styles.balance}>
            Balance: <span>{sudtBalance} MLMC </span>
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
          <FreshButton
            text={"Issue Sudt Token"}
            onClick={issueToken}
            custom_style={styles.button}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FreshButton
            text={"Deposit Sudt"}
            onClick={depositSudt}
            custom_style={styles.button}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FreshButton
            text={"Deploy Erc20-Proxy Contract"}
            onClick={deployErc20ProxyContract}
            custom_style={styles.button}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} style={styles.contract_container}>
          contract address:
          <SyntaxHighlighter language="javascript" style={gruvboxDark}>
            {erc20ProxyContractAddress || "not deployed yet."}
          </SyntaxHighlighter>
        </Grid>
      </Grid>
    </div>
  );
}
