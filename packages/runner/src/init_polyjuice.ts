import path from "path";
import { Api } from "./api";

const _indexer_path = path.resolve(__dirname, "../db/ckb-indexer-data");
const ckb_rpc = "http://127.0.0.1:8114";
const godwoken_rpc = "http://127.0.0.1:8119";
const rollup_type_hash =
  "0x251e5a8d205b4b0abe675cab1c217424f03b8b39dceefc4c94ec4bf4b8b7a36c";
const sudt_id_str =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const amount = "40000000000";
const miner_private_key =
  "0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b";
const miner_ckb_devnet_addr = 'ckt1qyqy84gfm9ljvqr69p0njfqullx5zy2hr9kq0pd3n5';
const eth_private_key =
  "0x9582bd2e7a45def7696215a39b176f73432650c63b395e86b0edc657ff7fad52";
const eth_address = "0xdb35f58677b7C1339D1a030a0dbb23454A45DD95";
const contract_code =
  "0x60806040525b607b60006000508190909055505b610018565b60db806100266000396000f3fe60806040526004361060295760003560e01c806360fe47b114602f5780636d4ce63c14605b576029565b60006000fd5b60596004803603602081101560445760006000fd5b81019080803590602001909291905050506084565b005b34801560675760006000fd5b50606e6094565b6040518082815260200191505060405180910390f35b8060006000508190909055505b50565b6000600060005054905060a2565b9056fea2646970667358221220044daf4e34adffc61c3bb9e8f40061731972d32db5b8c2bc975123da9e988c3e64736f6c63430006060033";


const user_private_key = '0x6cd5e7be2f6504aa5ae7c0c04178d8f47b7cfc63b71d95d9e6282f5b090431bf';
const user_ckb_devnet_addr = 'ckt1qyqf22qfzaer95xm5d2m5km0f6k288x9warqnhsf4m';

const user_account_init_amount = 800000000000n;

export const run = async () => {
  console.log("start..");
  const api = new Api(ckb_rpc, godwoken_rpc, _indexer_path);
  try {
    await api.syncLayer1();
    // await api.giveUserLayer1AccountSomeMoney(miner_ckb_devnet_addr, miner_private_key, user_ckb_devnet_addr, user_account_init_amount);
    const from_id = await api.deposit(user_private_key, undefined, amount);
    console.log(`create deposit account.`);
    const creator_account_id = await api.createCreatorAccount(
      from_id,
      sudt_id_str,
      rollup_type_hash,
      eth_private_key
    );
    console.log(`create creator account.`);
    console.log(`finished~`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();

