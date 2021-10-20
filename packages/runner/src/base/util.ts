import { RPC } from "ckb-js-toolkit";
import { HexString, Hash, Indexer } from "@ckb-lumos/base";
import TOML from "@iarna/toml";
import fs from "fs";
import path from "path";
import { GodwokenScriptsPath } from "./types/gw";

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

export async function generateGodwokenConfig(
  _input_file: string,
  _output_file: string
) {
  const toml_path: string = path.resolve(__dirname, _input_file);
  const toml_file_str = await fs.readFileSync(toml_path).toString();
  const toml_file_obj = TOML.parse(toml_file_str);
  const json_path = path.resolve(__dirname, _output_file);
  await fs.writeFileSync(json_path, JSON.stringify(toml_file_obj, null, 2));
  console.log(`create godwoken-config.json file in ${json_path}. done.`);
}

export async function saveJsonFile(jsonObj: Object, path: string) {
  const data = JSON.stringify(jsonObj, null, 2);
  try {
    await fs.writeFileSync(path, data);
    return true;
  } catch (error) {
    console.error(`can not save the json file, err: ${error.message}`);
    return false;
  }
}

export async function loadJsonFile(
  path: string,
  encoding?: BufferEncoding
): Promise<Object | null> {
  try {
    const data = await fs.readFileSync(path);
    if (encoding) {
      const data_json = JSON.parse(data.toString(encoding));
      return data_json;
    }
    const data_json = JSON.parse(data.toLocaleString());
    return data_json;
  } catch (error) {
    console.error(`json file not exist, err: ${error.message}`);
    return null;
  }
}

export async function readScriptCodeHashFromFile(script_path: string) {
  const contract_file = path.join(script_path);
  const complied_code = await fs.readFileSync(contract_file);
  return "0x" + complied_code.toString("hex");
}

export async function getDeployScriptsPaths(_file_path: string) {
  const file_path = path.resolve(_file_path);
  try {
    const scripts_file = await fs.readFileSync(file_path);
    const scripts = JSON.parse(scripts_file.toLocaleString());

    if ("built_scripts" in scripts) {
      const scripts_paths: GodwokenScriptsPath = scripts.built_scripts;
      return scripts_paths;
    } else {
      throw new Error(`built_scripts not exist in scripts json ${scripts}`);
    }
  } catch (error) {
    throw new Error(`failed to read and parse scripts file,` + error.message);
  }
}

export async function retry_execution(
  method: any,
  args: any[],
  max_retry_limit: number = 10,
  intervals: number = 5000,
  retry: number = 0
) {
  try {
    await method(...args);
    retry++;
  } catch (e) {
    console.error(e);
    if (retry < max_retry_limit) {
      await asyncSleep(intervals);
      console.log(`keep retrying...${retry}th times...`);
      await retry_execution(method, args, max_retry_limit, intervals, retry);
    } else {
      throw new Error(`retry ${max_retry_limit}th times, still failed. abort.`);
    }
  }
}

export function UInt32ToLeBytes(num: number): HexString {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(+num, 0);
  return "0x" + buf.toString("hex");
}

export function toBigUInt64LE(num: number | bigint) {
  const bnum = BigInt(num);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(bnum);
  return `0x${buf.toString("hex")}`;
}

export function toBigUInt64BE(num: number | bigint) {
  const bnum = BigInt(num);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(bnum);
  return `0x${buf.toString("hex")}`;
}

// todo: refactor this function to suit ts strict mode
export function deepCompare(o: object, p: object) {
  let i: number,
    keysO = Object.keys(o).sort(),
    keysP = Object.keys(p).sort();
  if (keysO.length !== keysP.length) return false; //not the same nr of keys
  if (keysO.join("") !== keysP.join("")) return false; //different keys
  for (i = 0; i < keysO.length; ++i) {
    if (o[keysO[i]] instanceof Array) {
      if (!(p[keysO[i]] instanceof Array)) return false;
      //if (compareObjects(o[keysO[i]], p[keysO[i]] === false) return false
      //would work, too, and perhaps is a better fit, still, this is easy, too
      if (p[keysO[i]].sort().join("") !== o[keysO[i]].sort().join(""))
        return false;
    } else if (o[keysO[i]] instanceof Date) {
      if (!(p[keysO[i]] instanceof Date)) return false;
      if ("" + o[keysO[i]] !== "" + p[keysO[i]]) return false;
    } else if (o[keysO[i]] instanceof Function) {
      if (!(p[keysO[i]] instanceof Function)) return false;
      //ignore functions, or check them regardless?
    } else if (o[keysO[i]] instanceof Object) {
      if (!(p[keysO[i]] instanceof Object)) return false;
      if (o[keysO[i]] === o) {
        //self reference?
        if (p[keysO[i]] !== p) return false;
      } else if (deepCompare(o[keysO[i]], p[keysO[i]]) === false) return false; //WARNING: does not deal with circular refs other than ^^
    }
    if (o[keysO[i]] !== p[keysO[i]])
      //change !== to != for loose comparison
      return false; //not the same value
  }
  return true;
}

// todo: refactor this class to fit ts strict mode
export class DeepDiffMapper {
  private VALUE_CREATED = "created";
  private VALUE_UPDATED = "updated";
  private VALUE_DELETED = "deleted";
  private VALUE_UNCHANGED = "unchanged";

  constructor() {}

  map(obj1: object, obj2: object) {
    if (this.isFunction(obj1) || this.isFunction(obj2)) {
      throw "Invalid argument. Function given, object expected.";
    }
    if (this.isValue(obj1) || this.isValue(obj2)) {
      return {
        type: this.compareValues(obj1, obj2),
        data: obj1 === undefined ? obj2 : obj1,
      };
    }

    let diff = {};
    for (let key in obj1) {
      if (this.isFunction(obj1[key])) {
        continue;
      }

      let value2 = undefined;
      if (obj2[key] !== undefined) {
        value2 = obj2[key];
      }

      diff[key] = this.map(obj1[key], value2);
    }

    for (let key in obj2) {
      if (this.isFunction(obj2[key]) || diff[key] !== undefined) {
        continue;
      }

      diff[key] = this.map(undefined, obj2[key]);
    }
    return diff;
  }

  // extract the updated parts in diff result from map method.
  async filterDiff(diff_obj: any, target = [], paths = []) {
    for await (const [key, value] of Object.entries(diff_obj)) {
      if (key === "type" && value === "unchanged") {
        // reached the end of one unchanged part, let's clear the last parent paths.
        delete paths[paths.length - 1];
      }
      if (key === "type" && value !== "unchanged") {
        let path_str = paths.join(".");
        // remove the dead end branch path
        path_str = path_str.replace(/([A-Za-z0-9_]+\.(\.+))/g, "");
        // push the result into target
        const item: any = {};
        item[path_str] = diff_obj;
        target.push(item);
        break;
      }
      if (this.isObject(value)) {
        paths.push(key);
        await this.filterDiff(value, target, paths);
      }
    }

    return target;
  }

  compareValues(value1: any, value2: any) {
    if (value1 === value2) {
      return this.VALUE_UNCHANGED;
    }
    if (
      this.isDate(value1) &&
      this.isDate(value2) &&
      value1.getTime() === value2.getTime()
    ) {
      return this.VALUE_UNCHANGED;
    }
    if (value1 === undefined) {
      return this.VALUE_CREATED;
    }
    if (value2 === undefined) {
      return this.VALUE_DELETED;
    }
    return this.VALUE_UPDATED;
  }

  isFunction(x: any) {
    return Object.prototype.toString.call(x) === "[object Function]";
  }

  isArray(x: any) {
    return Object.prototype.toString.call(x) === "[object Array]";
  }

  isDate(x: any) {
    return Object.prototype.toString.call(x) === "[object Date]";
  }

  isObject(x: any) {
    return Object.prototype.toString.call(x) === "[object Object]";
  }

  isValue(x: any) {
    return !this.isObject(x) && !this.isArray(x);
  }
}
