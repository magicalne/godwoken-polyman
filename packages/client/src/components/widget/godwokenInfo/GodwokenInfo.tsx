import SimpleJsonInfo from "./SimpleJsonInfo";
import Api from "../../../api";
import { useState } from "react";
import { useEffect } from "react";

export default function GodwokenInfo() {
  const [scripts, setScripts] = useState();
  const [config, setConfig] = useState();

  useEffect(() => {
    fetchInfo();
  }, []);

  const fetchInfo = async () => {
    const api = new Api();
    const scripts = await api.getGodwokenScriptDeployResultFile();
    const config = await api.getGodwokenConfigFile();
    await setScripts(scripts);
    await setConfig(config);
  };

  return (
    <div>
      <SimpleJsonInfo title="Godwoken Scripts Deploy Result" jsonInfo={scripts} />
      <SimpleJsonInfo title="Godwoken Rollup Config" jsonInfo={config} />
    </div>
  );
}
