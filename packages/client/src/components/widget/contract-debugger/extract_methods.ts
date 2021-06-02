import { AbiItem } from 'web3-utils'

const SIMPLE_STORAGE_ABI = [
  { inputs: [], stateMutability: "payable", type: "constructor" },
  {
    inputs: [],
    name: "get",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "x", type: "uint256" }],
    name: "set",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

export const extract = (abi: AbiItem[]) => {
  console.log(abi, null, 2);
  for (var item in abi) {
    
  }
};

export const assembleCallTx = (abi_item: AbiItem) => {
   if (abi_item.type !== 'function' || abi_item.stateMutability !== 'view')
    throw new Error("expect a call view function");

   const function_name = abi_item.name;
   
     
}

export const assemblePayableSendTx = (abi_item: AbiItem) => {

}
