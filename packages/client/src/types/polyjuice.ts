import {
    RawL2Transaction,
  } from "@godwoken-polyman/godwoken";

export type OpType = 'create_creator' | 'deposit' | 'deploy'

export type MsgSignType = {
    type: OpType;
    raw_l2tx: RawL2Transaction;
    message: string;
    l2_script_args: string;
}
