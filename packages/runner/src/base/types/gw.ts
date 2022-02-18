import { DepType, HexNumber, HexString, OutPoint } from "@ckb-lumos/base";

export type GodwokenScriptsPath = {
  eth_account_lock: string;
  deposit_lock: string;
  polyjuice_generator: string;
  l2_sudt_validator: string;
  meta_contract_validator: string;
  custodian_lock: string;
  l2_sudt_generator: string;
  state_validator_lock: string;
  challenge_lock: string;
  meta_contract_generator: string;
  always_success: string;
  state_validator: string;
  polyjuice_validator: string;
  eth_addr_reg_validator: string;
  withdrawal_lock: string;
  tron_account_lock: string;
};

export type GodwokenScriptDep = {
  script_type_hash: HexString;
  cell_dep: {
    out_point: {
      tx_hash: HexString;
      index: HexNumber;
    };
    dep_type: DepType;
  };
};

export type GodwokenScriptsDeployResult = {
  custodian_lock: GodwokenScriptDep;
  deposit_lock: GodwokenScriptDep;
  withdrawal_lock: GodwokenScriptDep;
  challenge_lock: GodwokenScriptDep;
  stake_lock: GodwokenScriptDep;
  state_validator: GodwokenScriptDep;
  meta_contract_validator: GodwokenScriptDep;
  l2_sudt_validator: GodwokenScriptDep;
  eth_account_lock: GodwokenScriptDep;
  tron_account_lock: GodwokenScriptDep;
  polyjuice_validator: GodwokenScriptDep;
  eth_addr_reg_validator: GodwokenScriptDep;
};

export type ScriptDeploymentTransactionInfo = {
  outpoint: OutPoint;
  script_hash: HexString;
};
