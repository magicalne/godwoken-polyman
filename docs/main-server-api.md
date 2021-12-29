# Main Sever Api

port: 6101

## jam test api

### generate accounts

```sh
curl http://localhost:6101/prepare_jam_accounts?total=2000
```

in kicker, the accounts json file is located in `cache/activity/poljuice` dir

### transafer some ckb for generated accounts

```sh
curl http://localhost:6101/prepare_jam_accounts?total=2000
```

### deposit some l2 ckb for generated accounts

```sh
curl http://localhost:6101/deposit_jam_accounts?total=2000
```

### jam ckb network with meaningless l1 self-transafer tx

```sh
curl http://localhost:6101/jam_ckb_network?total=2000
```
