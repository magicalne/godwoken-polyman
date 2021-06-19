import { Hash, HexNumber, Script } from "@ckb-lumos/base";
import { L2Transaction, WithdrawalRequest } from "./index";
export interface DepositRequest {
    capacity: HexNumber;
    amount: HexNumber;
    sudt_script_hash: Hash;
    script: Script;
}
export declare function NormalizeDepositRequest(request: object, { debugPath }?: {
    debugPath?: string;
}): any;
export declare function NormalizeDepositLockArgs(args: object, { debugPath }?: {
    debugPath?: string;
}): any;
export interface HeaderInfo {
    number: HexNumber;
    block_hash: Hash;
}
export declare function NormalizeHeaderInfo(headerInfo: object, { debugPath }?: {
    debugPath?: string;
}): any;
export interface CustodianLockArgs {
    owner_lock_hash: Hash;
    deposit_block_hash: Hash;
    deposit_block_number: HexNumber;
}
export declare function NormalizeCustodianLockArgs(args: object, { debugPath }?: {
    debugPath?: string;
}): any;
export declare function NormalizeRawL2Transaction(rawL2Transaction: object, { debugPath }?: {
    debugPath?: string;
}): any;
export declare function NormalizeL2Transaction(l2Transaction: L2Transaction, { debugPath }?: {
    debugPath?: string;
}): any;
export declare function NormalizeRawWithdrawalRequest(raw_request: object, { debugPath }?: {
    debugPath?: string;
}): any;
export declare function NormalizeWithdrawalRequest(request: WithdrawalRequest, { debugPath }?: {
    debugPath?: string;
}): any;
export interface UnoinType {
    type: string;
    value: any;
}
export declare function NormalizeCreateAccount(createAccount: object, { debugPath }?: {
    debugPath?: string;
}): any;
export interface SUDTQuery {
    account_id: HexNumber;
}
export declare function NormalizeSUDTQuery(sudt_query: object, { debugPath }?: {
    debugPath?: string;
}): any;
export interface SUDTTransfer {
    to: HexNumber;
    amount: HexNumber;
    fee: HexNumber;
}
export declare function NormalizeSUDTTransfer(sudt_transfer: object, { debugPath }?: {
    debugPath?: string;
}): any;
export declare function NormalizeWithdrawalLockArgs(withdrawal_lock_args: object, { debugPath }?: {
    debugPath?: string;
}): any;
export declare function NormalizeUnlockWithdrawalViaFinalize(unlock_withdrawal_finalize: object, { debugPath }?: {
    debugPath?: string;
}): any;
