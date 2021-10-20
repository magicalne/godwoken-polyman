import { Api } from "../api";

export class Service {
  public req;
  public res;
  public api: Api;
  public name: string;

  constructor(api: Api, name?: string, req?, res?) {
    this.req = req;
    this.res = res;
    this.api = api;
    this.name = name;
  }

  async initRequest(req, res) {
    this.req = req;
    this.res = res;
    await this.api.syncToTip();
  }

  // default home page router: http://xxxxxx:port/
  default() {
    return `you just reach ${this.name} api server.`;
  }

  ping() {
    return "pong";
  }
}
