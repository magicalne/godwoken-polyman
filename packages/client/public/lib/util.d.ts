import "@babel/polyfill";
import { Script, Hash, HexNumber, HexString } from "@ckb-lumos/base";
import { RawL2Transaction, L2Transaction } from "./godwoken";
export declare type EthTransaction = {
    from: HexString;
    to: HexString;
    gas?: HexNumber;
    gasPrice?: HexNumber;
    value: HexNumber;
    data: HexString;
    nonce?: HexNumber;
};
export declare type L2TransactionArgs = {
    to_id: number;
    value: bigint;
    data: HexString;
};
export declare type GodwokerOption = {
    godwoken: {
        rollup_type_hash: Hash;
        eth_account_lock: Omit<Script, "args">;
    };
    queryEthAddressByShortAddress?: (short_address: string) => string;
    saveEthAddressShortAddressMapping?: (eth_address: string, short_address: string) => void;
    request_option?: object;
};
export declare type RequestRpcResult = {
    err: any;
    data?: string;
};
export declare class Godwoker {
    private eth_account_lock;
    private rollup_type_hash;
    private client;
    private godwkenUtils;
    private queryEthAddressByShortAddress;
    private saveEthAddressShortAddressMapping;
    constructor(host: string, option: GodwokerOption);
    packSignature(_signature: Hash): Hash;
    computeScriptHashByEoaEthAddress(eth_address: string): string;
    getScriptByScriptHash(_script_hash: string): Promise<Script>;
    getScriptHashByAccountId(account_id: number): Promise<string>;
    getAccountIdByScriptHash(script_hash: string): Promise<string>;
    getAccountIdByEoaEthAddress(eth_address: string): Promise<string>;
    getScriptHashByShortAddress(_address: string): Promise<string>;
    computeShortAddressByEoaEthAddress(_address: string, write_callback?: (eth_address: string, short_address: string) => void): string;
    getShortAddressByAllTypeEthAddress(_address: string): Promise<string>;
    getEthAddressByAllTypeShortAddress(_short_address: string): Promise<any>;
    checkEthAddressIsEoa(eth_address: string, _target_short_address: string): boolean;
    defaultQueryEthAddressByShortAddress(_short_address: string): Promise<string>;
    defaultSaveEthAddressShortAddressMapping(_eth_address: string, _short_address: string): Promise<unknown>;
    getNonce(account_id: number): Promise<string>;
    assembleRawL2Transaction(eth_tx: EthTransaction): Promise<RawL2Transaction>;
    generateTransactionMessageToSign(tx: RawL2Transaction, sender_script_hash: string, receiver_script_hash: string): string;
    serializeL2Transaction(tx: L2Transaction): string;
    serializeRawL2Transaction(tx: RawL2Transaction): string;
    gw_executeL2Tranaction(raw_tx: RawL2Transaction, signature: HexString): Promise<string>;
    gw_executeRawL2Transaction(raw_tx: RawL2Transaction): Promise<string>;
    gw_submitL2Transaction(raw_tx: RawL2Transaction, signature: HexString): Promise<string>;
    gw_getTransactionReceipt(tx_hash: Hash): Promise<string>;
    waitForTransactionReceipt(tx_hash: Hash): Promise<void>;
    asyncSleep(ms?: number): Promise<unknown>;
    allTypeEthAddressToAccountId(_address: HexString): Promise<HexNumber>;
    encodeArgs(_tx: EthTransaction): string;
    UInt32ToLeBytes(num: number): HexString;
    UInt64ToLeBytes(num: bigint): HexString;
    UInt128ToLeBytes(u128: bigint): HexString;
    LeBytesToUInt32(hex: HexString): number;
}
