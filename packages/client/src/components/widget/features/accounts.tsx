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
import Api from "../../../api";
import FreshButton from "../fresh_button";
import { notify } from "../notify";

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
    </div>
  );
}
