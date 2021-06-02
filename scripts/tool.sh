copy_configs_if_not_exist(){
    [ ! -e packages/runner/configs/config.toml ] && cp packages/runner/configs/examples/config.toml.example packages/runner/configs/config.toml || echo 'do nothing'; 
    [ ! -e packages/runner/configs/godwoken_config.json ] && cp packages/runner/configs/examples/godwoken_config.json.example packages/runner/configs/godwoken_config.json || echo 'do nothing'; 
    [ ! -e packages/runner/configs/scripts-deploy-result.json ] && cp packages/runner/configs/examples/scripts-deploy-result.json.example packages/runner/configs/scripts-deploy-result.json || echo 'do nothing'; 
}
