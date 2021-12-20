import { HexString } from "@ckb-lumos/base";
import { Api } from "../api";
import { newEthAccountList, TestAccount } from "./helper";
import { indexerDbPath, polymanConfig } from "../base/config";
import { loadJsonFile, saveJsonFile } from "../base/util";
import path from "path";

const testAccountsJsonPath = path.resolve(
  indexerDbPath,
  "./test-accounts.json"
);

export class Tester {
  public api: Api;
  public privateKey: HexString; // the root account to distribute money to test accounts
  public testAccounts: TestAccount[];

  constructor(api: Api, privateKey: string, testAccounts?: TestAccount[]) {
    this.api = api;
    this.privateKey = privateKey;
    this.testAccounts = testAccounts || [];
  }

  /**
   *
   * @param length total test accounts number
   * @param initialAmount deposit for each test account
   */
  async prepareTestAccounts(
    length: number = 20,
    initialAmount: string = polymanConfig.default_quantity.deposit_amount
  ) {
    let that = this;
    await this.api.syncToTip();

    const testAccountsJson = await loadJsonFile(testAccountsJsonPath);
    if (testAccountsJson != null) {
      this.testAccounts = testAccountsJson as TestAccount[];
      return this.testAccounts;
    }

    console.debug(
      "can not load test accounts from file, try generating brand new accounts."
    );

    // let's prepare some live cells for deposit
    const splitTxHash = await this.api.sendSplitCells(
      BigInt(initialAmount) * BigInt(length) * BigInt(2),
      length,
      this.privateKey
    );
    await this.api.waitForCkbTx(splitTxHash);

    // generate accounts and make deposit
    const accounts = newEthAccountList(length);
    const checkDepositPromiseList: any[] = [];

    for await (const account of accounts) {
      const { txHash, ethAddress } = await that.api.generateDepositTx(
        that.privateKey,
        account.ethAddress,
        initialAmount
      );

      const p = new Promise(async (resolve, reject) => {
        try {
          const accountId = await that.api.checkDepositByTxHash(
            txHash,
            ethAddress
          );
          return resolve({
            ...account,
            ...{ accountId: accountId },
          } as TestAccount);
        } catch (error) {
          return reject(error);
        }
      });
      checkDepositPromiseList.push(p);
    }

    return Promise.all(checkDepositPromiseList)
      .then((accounts: TestAccount[]) => {
        accounts.forEach((account) => {
          console.log(
            `successful deposit account: ${account.ethAddress}, accountId: ${account.accountId}`
          );
        });
        // save on local
        saveJsonFile(accounts, testAccountsJsonPath);
        that.testAccounts = accounts;
        return Promise.resolve(accounts);
      })
      .catch((error) => {
        Promise.reject(error);
      });
  }

  async genTestAccounts(
    length: number = 20,
    filePath: string = testAccountsJsonPath
  ) {
    const testAccountsJson = await loadJsonFile(filePath);
    if (testAccountsJson != null) {
      this.testAccounts = testAccountsJson as TestAccount[];

      if (this.testAccounts.length < length) {
        const offset = length - this.testAccounts.length;
        // generate accounts and make deposit
        const newAccounts = newEthAccountList(offset);
        this.testAccounts = [...this.testAccounts, ...newAccounts];
      }

      // save on local
      await saveJsonFile(this.testAccounts, filePath);
      return this.testAccounts;
    }

    // generate account json file
    this.testAccounts = newEthAccountList(length);
    await saveJsonFile(this.testAccounts, filePath);
    return this.testAccounts;
  }

  run() {}
}
