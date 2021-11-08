import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Theme,
  makeStyles,
  createStyles,
  Typography,
  ThemeProvider,
  Input,
  TextField,
  Paper,
} from "@material-ui/core";
import React, { useRef, useState } from "react";
import {
  PolyjuiceConfig,
} from "@polyjuice-provider/base"
import { PolyjuiceHttpProvider } from "@polyjuice-provider/web3";
import Api from "../../../api";
import { HexString } from "../../../types/blockchain";
import FreshButton from "../fresh_button";
import { notify } from "../notify";
import Web3 from "web3";
import config from "../../../config/constant.json";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      fontSize: "18px",
      textAlign: "center" as const,
      minHeight: "400px",
    },
    formControl: {
      margin: theme.spacing(1),
      minWidth: 400,
      fontSize: "18px",
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
    formControlButton: {
      paddingTop: "20px",
      minWidth: 150
    },
    hint: {
      width: "100%",
      textAlign: "center" as const,
      fontSize: "10px",
      color: "gray",
    },
  })
);

const styles = {
  freshBtn: {
    fontSize: "18px",
    color: "black",
    height: "40px",
  },
};

export interface DepositProps {
  addressVec: (string | undefined)[];
  updateBalanceTrigger?: () => void;
}

export default function Accounts(props: DepositProps) {
  const classes = useStyles();
  const { addressVec, updateBalanceTrigger } = props;
  const [selectedAddress, setSelectedAddress] = React.useState("");
  const [hints, setHints] = useState<string>("");
  const inputEthAddressRef = useRef<HTMLInputElement>();
  const inputTransferEthAddressRef = useRef<HTMLInputElement>();
  const inputTransferAmountRef = useRef<HTMLInputElement>();

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedAddress(event.target.value as string);
  };

  const addressItems = addressVec.map(
    (addr: string | undefined, index: number) => {
      return <MenuItem value={addr}>{addr}</MenuItem>;
    }
  );

  const deposit = async () => {
    if (!selectedAddress) return notify(`please select a eth address to deposit.`);
    await _deposit(selectedAddress);
  };

  const deposit2 = async () => {
    const addr = inputEthAddressRef?.current?.value;
    if (!addr || addr.length != 42) return notify(`invalid eth address.`);
    await _deposit(addr);
  };

  const _deposit = async (ethAddress: string) => {
    const api = new Api();
    try {
      setHints("try submitting a deposit transaction, might takes couple mitutes...");
      const res = await api.deposit(ethAddress);
      console.log("deposit result =>", res);
      if (res.status === "ok") {
        notify(
          `deposit success! your account id: ${res.data.account_id}.`,
          "success"
        );
        if(updateBalanceTrigger) updateBalanceTrigger();
      } else {
        notify(JSON.stringify(res.error));
      }
      setHints("");
    } catch (error) {
      notify(JSON.stringify(error));
      setHints(JSON.stringify(error.message));
    }
  };

  const transfer = async () => {
    const toAddr = inputTransferEthAddressRef?.current?.value;
    if (!toAddr || toAddr.length != 42) return notify(`invalid eth address.`);

    const amountInEth = inputTransferAmountRef?.current?.value;

    if (!amountInEth) return notify(`invalid transfer amount.`);

    const amountInWei = BigInt(amountInEth) * BigInt(100_0000_0000_0000_0000);
    await _transfer(toAddr, amountInWei);
  }  

  const _transfer = async(to: HexString, amountInWei: bigint) => {
    try {
      const transactionObject = {
        gasPrice: "0x0000", // customizable by user during MetaMask confirmation.
        gas: "0x9184e72a000", // customizable by user during MetaMask confirmation.
        to: to, // Required except during contract publications.
        from: window.ethereum.selectedAddress, // must match user's active address.
        value: "0x" + amountInWei.toString(16), // Only required to send ether to the recipient from the initiating external account.
        data: "0x00", // Optional, but used for defining smart contract creation and interaction.
      };
      console.log("transfer eth tx:", transactionObject);
      const web3 = init_web3_provider();
      const txReceipt = await web3.eth.sendTransaction(transactionObject);
      console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`);
      notify(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`, "success");
    } catch(error){
      console.log(error);
      return notify(error.message);
    }
  }

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

  return (
    <div className={classes.root}>
      <Paper>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h4" gutterBottom>
              Create && Desposit
            </Typography>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl className={classes.formControl}>
              <InputLabel id="demo-simple-select-label">
                selectAddress
              </InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={selectedAddress}
                onChange={handleChange}
              >
                {addressItems}
              </Select>
            </FormControl>
            <FormControl className={classes.formControlButton}>
              <FreshButton
                custom_style={styles.freshBtn}
                text={"Deposit 400 CKB"}
                onClick={deposit}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography>Or Input Other Eth Address: </Typography>
          </Grid>
          <Grid item xs={12}>
            <FormControl className={classes.formControl}>
              <TextField
                id="standard-basic"
                label="ethAddress"
                inputRef={inputEthAddressRef}
              />
            </FormControl>
            <FormControl className={classes.formControlButton}>
              <FreshButton
                custom_style={styles.freshBtn}
                text={"Deposit 400 CKB"}
                onClick={deposit2}
              />
            </FormControl>
          </Grid>
          <div className={classes.hint}>
            <Typography>{hints}</Typography>
          </div>
        </Grid>
      </Paper>
      
      <Paper>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h4" gutterBottom>
              Transfer
            </Typography>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl className={classes.formControl}>
              <TextField
                id="standard-basic"
                label="to EthAddress"
                inputRef={inputTransferEthAddressRef}
              />
              <TextField
                id="standard-basic"
                label="amount"
                inputRef={inputTransferAmountRef}
              />
            </FormControl>
            <FormControl className={classes.formControlButton}>
              <FreshButton
                custom_style={styles.freshBtn}
                text={"transfer pETH(CKB)"}
                onClick={transfer}
              />
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
}
