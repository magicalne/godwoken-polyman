import { generateGodwokenConfig } from "./base/util";
import path from "path";

const run = async () => {
  // generate config file from config.toml
  const input = path.resolve(__dirname, "../configs/config.toml");
  const output = path.resolve(__dirname, "../configs/godwoken-config.json");
  await generateGodwokenConfig(input, output);
};

run();
