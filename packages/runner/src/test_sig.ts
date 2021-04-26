import {
  _signMessage,
} from "./common"

const message = "0x41b768e2df6184be530909437f3be3bc668875c464b10a18a61004094c8d5e5e"
const private_key = "0xc1c3a6a6509837572b575097ce62b19c7013b63ba4ac0f148af92260089fcfd8"
const _signature = _signMessage(message, private_key);
  
let v = Number.parseInt(_signature.slice(-2), 16);
if (v >= 27) v -= 27;
const signature = _signature.slice(0, -2) + v.toString(16).padStart(2, "0");

console.log(signature);