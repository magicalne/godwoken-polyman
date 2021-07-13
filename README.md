Godwoken Polyman
=======

this project is original fork from `godwoken-example`. the new project called `godwoken-polyman`, is designed to be running inside [godwoken-kicker](https://github.com/RetricSu/godwoken-kicker.git), where it leverge the polyman to auto deploy a godwoken/polyjuice chain and setup everything needed for developer to deploy their old ETH smart contract on godwoken in the quickest way.

How to run
------

build deps and UI

```sh
yarn && yarn prepare-ui
```

set Config file

```sh
cp <your godwoken `config.toml` file> packages/runner/configs/config.toml
cp <your godwoken `scripts-deploy-result.json` file> packages/runner/configs/scripts-deploy-result.json
yarn gen-config
```

or generate placeholder config files(for test)

```sh
yarn init_placeholder_config
```

change the miner config under `packages/runner/configs/polyman-config.json`

```json
{
    "miner_private_key": "<your miner private key in CKB devnet>",
    "miner_ckb_devnet_addr": "<your miner devnet address>"
}
```

prepare some money

```sh
yarn prepare-money
```

prepare sudt system scripts (deploy such one)

```sh
yarn prepare-sudt
```

start the service:

```sh
yarn start          # inside docker-compose environment
yarn start:normal   # outside docker, your local environment
```

the service will wait until godwoken rpc server is up and running, after that, it will auto deploy a polyjuice chain with creator_id like 0x3.

then you can access `http://localhost:6100` to deploy your ETH smart contract.

Run outside docker-compose
---

for each command, you can run `:normal` after, it will using the localhost url for godwoken and ckb components.

Anthor simple way to do this is to just change the rpc url to your own one under `components` section in `/packages/runner/configs/polyman-config.json`

## Testnet

If you want to start this [API](packages/runner/src/server.ts) server interacting with [CKB Aggron Testnet](https://explorer.nervos.org/aggron/), please update your own testnet account key pair into `packages/runner/configs/polyman-config.json`.

```json
{
  "user_private_key": "<Your private key on CKB Aggron testnet>",
  "user_ckb_devnet_addr": "<Your address on CKB Aggron testnet>",
}
```

You can use [Nervos Aggron Faucet](https://faucet.nervos.org/) to make sure that there are enough testnet CKBytes in your account.

Note: The `account-cli` tool uses a builtin CKB Indexer, which needs to fully synchronize with a Testnet CKB Indexer before it can create transactions. This may take a long time, but there are 2 ways to speed it up:
1. Copy the testnet indexer data from `testnet-polyjuice-api:latest` docker image
```
docker run --rm \
  -v`pwd`/db/ckb-indexer-testnet:/ckb-indexer-testnet \
  ghcr.io/flouse/testnet-polyjuice-api:latest bash -c \
  "cp /godwoken-polyman/packages/runner/db/ckb-indexer-testnet/* packages/runner/db/ckb-indexer-testnet/"
```
2. Download testnet indexer snapshot data from [Amazon S3](https://github.com/RetricSu/gw-gitcoin-instruction/blob/8c02c1584d527fca24f983dc33d19b6bb765b1f8/src/component-tutorials/12.using.snapshot.data.with.account.cli.md)

And then, start the API service with `testnet` mode without [UI](packages/runner/src/ui.ts).

```
cd packages/runner && yarn start:testnet
```
