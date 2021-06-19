import { AbiOutput, AbiInput, AbiItem } from "web3-utils";
export interface MethodIDs {
    [method_id: string]: AbiItem;
}
export interface DecodedMethodParam extends AbiInput {
    value: string | string[];
}
export interface DecodedMethod {
    name: string;
    params: DecodedMethodParam[];
}
export declare class Abi {
    private abi_items;
    private interested_methods;
    private interested_method_ids;
    constructor(_abi_items: AbiItem[]);
    get_method_ids(_abi_items: AbiItem[]): MethodIDs;
    filter_interested_methods(_abi_items: AbiItem[]): AbiItem[];
    filter_interested_inputs(_abiItem: AbiItem): AbiInput[];
    filter_interested_outputs(_abiItem: AbiItem): AbiOutput[];
    get_interested_methods(): AbiItem[];
    get_abi_items(): AbiItem[];
    decode_method(data: string): DecodedMethod;
    get_intereted_abi_item_by_encoded_data(data: string): AbiItem;
    refactor_data_with_short_address(data: string, calculate_short_address: (addr: string) => Promise<string>): Promise<any>;
    refactor_return_value_with_short_address(return_value: string, abi_item: AbiItem, calculate_short_address: (addr: string) => Promise<string>): Promise<any>;
    read_abi_from_json_file(): void;
}
