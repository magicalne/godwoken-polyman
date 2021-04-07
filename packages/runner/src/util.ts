import { RPC } from "ckb-js-toolkit";
import {
    CellDep,
    HexString,
    HexNumber,
    Hash,
    Indexer,
    Script,
} from "@ckb-lumos/base";
import {
    generateDepositionLock,
    DepositionLockArgs,
    getDepositionLockArgs,
    serializeArgs,
} from "../js/transactions/deposition";
import Config from "../configs/config.json";
import { normalizers } from "ckb-js-toolkit"; 
import base from "@ckb-lumos/base";
import { key } from "@ckb-lumos/hd";
import crypto from "crypto";
import keccak256 from "keccak256";
import { getConfig } from "@ckb-lumos/config-manager";
import {
    generateAddress,
} from "@ckb-lumos/helpers";

export function asyncSleep(ms = 0) {
    return new Promise((r) => setTimeout(r, ms));
}

export async function waitForBlockSync(
    indexer: Indexer,
    rpc: RPC,
    blockHash?: Hash,
    blockNumber?: bigint
) {
    if (!blockNumber) {
        const header = await rpc.get_header(blockHash);
        blockNumber = BigInt(header.number);
    }
    while (true) {
        await indexer.waitForSync();
        const tip = await indexer.tip();
        if (tip) {
            const indexedNumber = BigInt(tip.block_number);
            if (indexedNumber >= blockNumber) {
                // TODO: do we need to handle forks?
                break;
            }
        }
        await asyncSleep(2000);
    }
}

export function caculateLayer2LockScriptHash (
    layer2LockArgs: string
) {
    const layer2LockConfig = Config.layer2_lock;
    const script = {
      code_hash: layer2LockConfig.code_hash,
      hash_type: layer2LockConfig.hash_type,
      args: layer2LockArgs,
    };
    return base.utils.ckbHash(
      base.core.SerializeScript(normalizers.NormalizeScript(script))
    ).serializeJson();
}

export function serializeScript (script: Script) {
    return base.utils.ckbHash(
        base.core.SerializeScript(normalizers.NormalizeScript(script))
      ).serializeJson(); 
}


export function privateKeyToCkbAddress(privateKey: HexString): string {
    const publicKey = key.privateToPublic(privateKey);
    const publicKeyHash = key.publicKeyToBlake160(publicKey);
    const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
    const script = {
        code_hash: scriptConfig.CODE_HASH,
        hash_type: scriptConfig.HASH_TYPE,
        args: publicKeyHash,
    };
    const address = generateAddress(script);
    return address;
}

export function privateKeyToEthAddress(privateKey: HexString) {
    const ecdh = crypto.createECDH(`secp256k1`);
    ecdh.generateKeys();
    ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
    const publicKey: string = "0x" + ecdh.getPublicKey("hex", "uncompressed");
    const ethAddress =
        "0x" +
        keccak256(Buffer.from(publicKey.slice(4), "hex"))
            .slice(12)
            .toString("hex");
    return ethAddress;
}