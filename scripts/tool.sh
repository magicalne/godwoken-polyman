copy_configs_if_not_exist(){
    [ ! -e packages/runner/configs/config.toml ] && cp packages/runner/configs/config.toml.example packages/runner/configs/config.toml;
    [ ! -e packages/runner/configs/godwoken_config.json ] && cp packages/runner/configs/godwoken_config.json.example packages/runner/configs/godwoken_config.json; 
    [ ! -e packages/runner/configs/scripts-deploy-result.json ] && cp packages/runner/configs/scripts-deploy-result.json.example packages/runner/configs/scripts-deploy-result.json; 
}
