import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  makeStyles,
  Link,
  Typography,
  Grid,
} from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { notify } from "../notify";
import Web3Api from "../../../api/web3";
import Api from "../../../api/index";
import { gruvboxDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import common_styles from "../common_style";
import SyntaxHighlighter from "react-syntax-highlighter";

const useStyles = makeStyles({
  root: {
    textAlign: "left" as const,
  },
});

export interface EthAccountLockConfig {
  code_hash: string;
  hash_type: "data" | "type";
}

export default function ChainInfo() {
  const classes = useStyles();

  const [rollupTypeHash, setRollupTypeHash] = useState<string>();
  const [ethAccountLockConfig, setEthAccountLockConfig] =
    useState<EthAccountLockConfig>();
  const [chainId, setChainId] = useState<string>();
  const [creatorId, setCreatorId] = useState<string>();
  const [contractTypeHash, setContractTypeHash] = useState<string>();
  const [serverConfig, setServerConfig] = useState<any>();

  const getChainInfo = async () => {
    const web3Api = new Web3Api();
    try {
      const data = await web3Api.getChainInfo();
      console.log(data);
      if (data.error) return notify(`failed to get chain info, `, data.error);

      const info = data.result;
      await setChainId(info.chainId);
      await setCreatorId(info.polyjuiceCreatorId);
      await setRollupTypeHash(info.rollupScriptHash);
      await setEthAccountLockConfig({
        hash_type: "type",
        code_hash: info.ethAccountLockTypeHash,
      });
      await setContractTypeHash(info.polyjuiceContractTypeHash); 
    } catch (error) {
      console.log(`get chain info error`);
      console.log(error);
      notify(error.message);
    }
  }

  const getChainId = async () => {
    const web3Api = new Web3Api();
    try {
      const data = await web3Api.getChainId();
      console.log(data);
      if (data.error) return notify(`failed to get chain id, `, data.error);

      await setChainId(data.result);
    } catch (error) {
      console.log(`get chain id error`);
      console.log(error);
      notify(error.message);
    }
  };

  const getCreatorId = async () => {
    const web3Api = new Web3Api();
    try {
      const data = await web3Api.getCreatorId();
      console.log(data);
      if (data.error) return notify(`failed to get creator id, `, data.error);

      await setCreatorId(data.result);
    } catch (error) {
      console.log(`get creator id error`);
      console.log(error);
      notify(error.message);
    }
  };

  const getPolyjuiceContractValidatorTypeHash = async () => {
    const web3Api = new Web3Api();
    try {
      const data = await web3Api.getPolyjuiceContractTypeHash();
      console.log(data);
      if (data.error)
        return notify(
          `failed to get polyjuice contract validator type hash, `,
          data.error
        );

      await setContractTypeHash(data.result);
    } catch (error) {
      console.log(`get creator id error`);
      console.log(error);
      notify(error.message);
    }
  };

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
      notify(error.message);
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
      notify(error.message);
    }
  };

  const getServerConfig = async () => {
    const api = new Api();
    try {
      const res = await api.getServerConfig();
      if (res.status !== "ok")
        return notify(
          `failed to get server config. ${JSON.stringify(res.error)}`
        );
        console.log(res.data);
      setServerConfig(res.data);
    } catch (error) {
      console.log(`get server config error`);
      console.log(error);
      notify(error.message);
    }
  };

  useEffect(() => {
    getChainInfo(); 
    getServerConfig();
  }, []);

  const AllApis = `
  ## Web3 Api
  EndPoint:  ${new Web3Api().url}
  - ChainInfo: JsonRpc 2.0, poly_getChainInfo
  - RollupTypeHash: JsonRpc 2.0, poly_getRollupTypeHash 
  - RollupConfigHash: JsonRpc 2.0, poly_getRollupConfigHash
  - EthAccountLockHash: JsonRpc 2.0, poly_getEthAccountLockHash  
  - PolyjuiceContractTypeHash: JsonRpc 2.0, poly_getContractValidatorTypeHash

  ## Kicker Api
  EndPoint:  ${new Api().getUrl()}
  - RollupTypeHash: Http Get, ${new Api().getUrl()}/get_rollup_type_hash 
  - EthAccountLock: Http Get, ${new Api().getUrl()}/get_eth_account_lock
  - DepositWithEthAddress: Http Get, ${new Api().getUrl()}/deposit?eth_address=<your eth address>
  
  ## Godwoken JsonRpc
  EndPoint: http://localhost:8119

  ## CKB JsonRpc
  EndPoint: http://localhost:8114
  `;

  function createData(name: string, value: string | undefined) {
    return { name, value };
  }

  const chainInfoRows = [
    createData("Chain ID", chainId),
    createData("Polyjuice Creator_id(CKB)", creatorId),
    createData("Rollup Script Hash", rollupTypeHash),
    createData("ETH Account Lock Hash", ethAccountLockConfig?.code_hash),
    createData("Polyjuice Contract Type Hash", contractTypeHash),
  ];

  const chainInfoTable = (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow></TableRow>
        </TableHead>
        <TableBody>
          {chainInfoRows.map((row) => (
            <TableRow key={row.name}>
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell>{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  function createSystemWalletData(
    name: string,
    addr: string | undefined,
    pk: string | undefined
  ) {
    return { name, addr, pk };
  }

  const systemWalletRows = [
    createSystemWalletData("Type", "CKB Address", "Private Key"),
    createSystemWalletData(
      "the only and lonely CKB miner",
      serverConfig?.addresses.miner_ckb_devnet_addr,
      serverConfig?.addresses.miner_private_key
    ),
    createSystemWalletData(
      "the only and lonely Godwoken miner",
      serverConfig?.addresses.miner_ckb_devnet_addr,
      serverConfig?.addresses.miner_private_key
    ),
    createSystemWalletData(
      "the meta-user to create everything",
      serverConfig?.addresses.user_ckb_devnet_addr,
      serverConfig?.addresses.user_private_key
    ),
  ];

  const systemWalletTable = (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow></TableRow>
        </TableHead>
        <TableBody>
          {systemWalletRows.map((row) => (
            <TableRow key={row.name}>
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell>{row.addr}</TableCell>
              <TableCell>{row.pk}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const ApiInfo = (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography>Some Apis</Typography>
        <SyntaxHighlighter language="md" style={gruvboxDark}>
          {AllApis}
        </SyntaxHighlighter>
      </Grid>
    </Grid>
  );

  return (
    <div className={classes.root}>
      <Typography>
        <Link target="_blank" href={`/godwoken_info`}>
          Full Rollup Configs
        </Link>
      </Typography>
      <br />
      {chainInfoTable}

      <br />
      <br />

      <Typography>System Pre-defined Wallets</Typography>
      <br />
      {systemWalletTable}

      <br />
      <br />

      {ApiInfo}
    </div>
  );
}
