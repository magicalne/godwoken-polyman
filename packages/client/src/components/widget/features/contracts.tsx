import { Grid, Typography, Divider } from "@material-ui/core";
import React, { useRef, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { gruvboxDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import common_styles from "../common_style";
import utils from "../../../utils/index";
import ContractDebugger from "../contract-debugger/ContractDebugger";
import FreshButton from "../fresh_button";
import { notify } from "../notify";
import config from "../../../config/constant.json";
import Web3 from "web3";
import { PolyjuiceConfig } from "@polyjuice-provider/base"
import {
  PolyjuiceHttpProvider,
} from "@polyjuice-provider/web3";
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

export interface ContractsProps {
  selectedAddress: string | undefined;
  rollupTypeHash: string | undefined;
  ethAccountLockConfig: EthAccountLockConfig | undefined;
}

export default function Contracts(props: ContractsProps) {
  const inputFile = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deployedContracts, setDeployedContracts] = useState<string[]>([]);
  useState<EthAccountLockConfig>();
  const { selectedAddress, rollupTypeHash, ethAccountLockConfig } = props;

  const init_web3_provider = () => {
    const godwoken_web3_rpc_url = config.web3_server_url;
    const provider_config: PolyjuiceConfig = {
      rollupTypeHash: rollupTypeHash || "",
      ethAccountLockCodeHash: ethAccountLockConfig?.code_hash || "",
      web3Url: godwoken_web3_rpc_url,
    };
    const provider = new PolyjuiceHttpProvider(
      godwoken_web3_rpc_url,
      provider_config
    );
    var web3 = new Web3(provider);
    return web3;
  };

  const readContractFileAsArtifacts = async (event: any) => {
    const codefile = event.target.files[0];
    const res: any = await utils.readDataFromFile(codefile);
    console.log(res);
    if (res.status !== "ok") {
      notify(`can not read contract abi from file.`);
      throw new Error("can not read contract abi from file.");
    }
    const data = JSON.parse(res.data);
    if (typeof data === "object" && data.bytecode) {
      // todo: validate bytecode
      return data.bytecode;
    } else {
      notify(`not a valid artifacts file!`);
      throw new Error("not a valid artifacts file!");
    }
  };

  const clickUploadContract = async () => {
    if (!inputFile) return notify(`input ref not found.`);
    inputFile.current!.click();
  };

  const _deployContract = async (contractCode: string) => {
    if (!contractCode)
      return notify(`upload contract binary file or contract artifacts first!`);
    if (!selectedAddress)
      return notify(`window.ethereum.selectedAddress not found.`);

    const web3 = init_web3_provider();
    try {
      const transactionObject = {
        nonce: 0, // ignored by MetaMask
        gasPrice: "0x0000", // customizable by user during MetaMask confirmation.
        gas: "0x9184e72a000", // customizable by user during MetaMask confirmation.
        to: "0x" + "0".repeat(40), // Required except during contract publications.
        from: window.ethereum.selectedAddress, // must match user's active address.
        value: "0x00", // Only required to send ether to the recipient from the initiating external account.
        data: contractCode, // Optional, but used for defining smart contract creation and interaction.
      };
      console.log(transactionObject);
      const txReceipt = await web3.eth.sendTransaction(transactionObject);
      console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);

      const contractAddr = txReceipt.contractAddress;
      console.log(`contract address: ${contractAddr}`);
      if (!contractAddr)
        return notify(
          `could not find your contract address in txReceipt: ${txReceipt}`
        );

      notify(`your contract address: ${contractAddr}`, "success");
      setDeployedContracts((oldArray) => [...oldArray, contractAddr]);
    } catch (error) {
      console.log(error);
      return notify(
        `could not finished signing process. \n\n ${JSON.stringify(error)}`
      );
    }
  };

  const readContractFileAsBinary = (codefile: Blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const code_hex = `0x${event.target.result}`;
        resolve({ status: "ok", data: code_hex });
      };
      reader.onerror = (err) => {
        resolve({ status: "failed", error: err });
      };
      reader.onabort = () => {
        resolve({ status: "failed", error: "user abort." });
      };
      reader.readAsBinaryString(codefile);
    });
  };

  const deployContract = async (e: any) => {
    const codefile = e.target.files[0];
    var contractBytecode: string;

    try {
      contractBytecode = await readContractFileAsArtifacts(e);
    } catch (error) {
      // read as binary without '0x'.
      const res: any = await readContractFileAsBinary(codefile);
      if (res.status !== "ok") {
        return notify(`can not read contract code from file.`);
      }
      contractBytecode = res.data;
      console.log("reading contract code hex:");
      console.log(contractBytecode);
    }

    // start uploading contract
    setIsLoading(true);
    await _deployContract(contractBytecode);
    setIsLoading(false);
  };
  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FreshButton
            text={"Deploy Contract"}
            isLoading={isLoading}
            onClick={clickUploadContract}
            custom_style={styles.button}
          />
          <input type="file" ref={inputFile} onChange={deployContract} hidden />
          <Typography style={{ fontSize: "12px", color: "gray" }}>
            Select Json File Of Artifacts Or Abi
          </Typography>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} style={styles.contract_container}>
          Contract Address:
          <SyntaxHighlighter language="javascript" style={gruvboxDark}>
            {deployedContracts.length > 0
              ? deployedContracts.join("\n")
              : "nothing."}
          </SyntaxHighlighter>
        </Grid>
      </Grid>
      <Divider></Divider>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h5">Contract Debugger</Typography>
          <ContractDebugger
            godwoken_config={{
              rollup_type_hash: rollupTypeHash,
              eth_account_lock_code_hash: ethAccountLockConfig?.code_hash,
              eth_account_lock_hash_type: ethAccountLockConfig?.hash_type,
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
}
