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
      notify(JSON.stringify(error));
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
      notify(JSON.stringify(error));
    }
  };

  const getPolyjuiceContractValidatorTypeHash = async () => {
    const web3Api = new Web3Api();
    try {
      const data = await web3Api.getPolyjucieContractTypeHash();
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
      notify(JSON.stringify(error));
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

  useEffect(() => {
    getChainId();
    getCreatorId();
    getRollupTypeHash();
    getEthAccountLockConfig();
    getPolyjuiceContractValidatorTypeHash();
  }, []);

  const AllApis = `
  ## Web3 Api
  EndPoint:  ${new Web3Api().url}
  ChainInfo: JsonRpc 2.0, poly_getChainInfo
  RollupTypeHash: JsonRpc 2.0, poly_getRollupTypeHash 
  RollupConfigHash: JsonRpc 2.0, poly_getRollupConfigHash
  EthAccountLockHash: JsonRpc 2.0, poly_getEthAccountLockHash  
  PolyjuiceContractTypeHash: JsonRpc 2.0, poly_getContractValidatorTypeHash

  ## Kicker Api
  EndPoint:  ${new Api().getUrl()}
  RollupTypeHash: Http Get ${new Api().getUrl()}/get_rollup_type_hash 
  EthAccountLock: Http Get ${new Api().getUrl()}/get_eth_account_lock
  `

  function createData(name: string, value: string | undefined) {
    return { name, value };
  }

  const rows = [
    createData("Chain ID", chainId),
    createData("Polyjuice Creator_id(CKB)", creatorId),
    createData("Rollup Script Hash", rollupTypeHash),
    createData("ETH Account Lock Hash", ethAccountLockConfig?.code_hash),
    createData("Polyjuice Contract Type Hash", contractTypeHash),
  ];

  const ApiInfo = (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        Api:
        <SyntaxHighlighter language="md" style={gruvboxDark}>
          { AllApis }
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
      <TableContainer component={Paper}>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow></TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
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

      <br />

      {ApiInfo}
    </div>
  );
}
