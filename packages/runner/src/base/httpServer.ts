import { Service } from "../services/service";
import { Application } from "express";

export enum HttpRequestType {
  "get",
  "post",
}
export type HttpRequestCallMethod = (req, res) => any;

export function getMethodNames(mod: any): string[] {
  return Object.getOwnPropertyNames(mod.prototype).filter(
    (name) => name !== "constructor" && name !== "initRequest"
  );
}

export const setUrlTargetMethod = async (
  app: Application,
  target: string,
  method: HttpRequestCallMethod,
  request_type: HttpRequestType = HttpRequestType.get
) => {
  const url = `/${target}`;
  const executeMethod = async (req, res) => {
    try {
      const return_data = await method(req, res);
      res.send({ status: "ok", data: return_data });
    } catch (error) {
      console.error(error);
      res.send({ status: "failed", error: error.message });
    }
  };
  switch (request_type) {
    case HttpRequestType.get:
      app.get(url, async (req, res) => {
        await executeMethod(req, res);
      });
      break;

    case HttpRequestType.get:
      app.post(url, async (req, res) => {
        await executeMethod(req, res);
      });
      break;

    default:
      throw new Error(`unknown request type, required ${HttpRequestType}`);
  }
};

export const setUpRouters = async (
  app: Application,
  service: Service,
  mod: typeof Service
) => {
  const base_service_methods: string[] = getMethodNames(Service); //public method like ping
  const method_names: string[] =
    getMethodNames(mod).concat(base_service_methods);
  console.log(`${service.name} server methods: `, method_names);
  for (let name of method_names) {
    const target_url = name === "default" ? "" : name; // default = url "/" home page
    const method = async (req, res) => {
      await service.initRequest(req, res);
      return service[name]();
    };
    // todo: add get or post type for class method
    await setUrlTargetMethod(app, target_url, method);
  }
};
