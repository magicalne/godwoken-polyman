import { generateGodwokenConfig } from "./base/util";

const run = async () => {
  // generate config file from config.toml
  await generateGodwokenConfig(
    "../configs/config.toml",
    "../configs/godwoken-config.json"
  );
};

run();
