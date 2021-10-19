import { DeepDiffMapper } from "../src/util";

const deepDiffMapper = new DeepDiffMapper();

const obj = {
  PREFIX: {
    type: "unchanged",
    data: "ckt",
  },
  SCRIPTS: {
    SECP256K1_BLAKE160: {
      CODE_HASH: {
        type: "unchanged",
        data: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      },
      HASH_TYPE: {
        type: "unchanged",
        data: "type",
      },
      TX_HASH: {
        type: "unchanged",
        data: "0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708",
      },
      INDEX: {
        type: "unchanged",
        data: "0x0",
      },
      DEP_TYPE: {
        type: "unchanged",
        data: "dep_group",
      },
      SHORT_ID: {
        type: "unchanged",
        data: 0,
      },
    },
    SECP256K1_BLAKE160_MULTISIG: {
      CODE_HASH: {
        type: "unchanged",
        data: "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
      },
      HASH_TYPE: {
        type: "unchanged",
        data: "type",
      },
      TX_HASH: {
        type: "unchanged",
        data: "0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708",
      },
      INDEX: {
        type: "unchanged",
        data: "0x1",
      },
      DEP_TYPE: {
        type: "unchanged",
        data: "dep_group",
      },
      SHORT_ID: {
        type: "unchanged",
        data: 1,
      },
    },
    DAO: {
      CODE_HASH: {
        type: "unchanged",
        data: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
      },
      HASH_TYPE: {
        type: "unchanged",
        data: "type",
      },
      TX_HASH: {
        type: "unchanged",
        data: "0xa563884b3686078ec7e7677a5f86449b15cf2693f3c1241766c6996f206cc541",
      },
      INDEX: {
        type: "unchanged",
        data: "0x2",
      },
      DEP_TYPE: {
        type: "unchanged",
        data: "code",
      },
    },
    ANYONE_CAN_PAY: {
      CODE_HASH: {
        type: "unchanged",
        data: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
      },
      HASH_TYPE: {
        type: "unchanged",
        data: "type",
      },
      TX_HASH: {
        type: "unchanged",
        data: "0xa563884b3686078ec7e7677a5f86449b15cf2693f3c1241766c6996f206cc541",
      },
      INDEX: {
        type: "unchanged",
        data: "0x2",
      },
      DEP_TYPE: {
        type: "unchanged",
        data: "code",
      },
    },
    SUDT: {
      CODE_HASH: {
        type: "updated",
        data: "0x87fa10bfe9e3b8e97315ce40e7d989d23145d469726e88b49d77acaed003b7eb",
      },
      HASH_TYPE: {
        type: "unchanged",
        data: "type",
      },
      TX_HASH: {
        type: "updated",
        data: "0xd3491b11c59a9afeeddef0e20b2e9722d654021aa8c70fdbea163581fe0bc49a",
      },
      INDEX: {
        type: "unchanged",
        data: "0x1",
      },
      DEP_TYPE: {
        type: "unchanged",
        data: "code",
      },
    },
  },
};

async function test() {
  const res = await deepDiffMapper.filterDiff(obj);
  console.log("result.......", JSON.stringify(res, null, 2));
}

test();
