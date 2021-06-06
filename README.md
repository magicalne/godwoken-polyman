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
    "miner_private_key": "<your miner private key in CKB devnet >",
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
yarn start # inside docker-compose environment
yarn start:normal # outside docker, your local environment
```

the service will wait until godwoken rpc server is up and running, after that, it will auto deploy a polyjuice chain with creator_id like 0x3.

then you can access `http://localhost:6100` to deploy your ETH smart contract.

Run outside docker-compose
---

for each command, you can run `:normal` after, it will using the localhost url for godwoken and ckb components.

Anthor simple way to do this is to just change the rpc url to your own one under `components` section in `/packages/runner/configs/polyman-config.json`
