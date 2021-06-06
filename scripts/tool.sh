copy_configs_if_not_exist(){
    [ ! -e packages/runner/configs/config.toml ] && cp packages/runner/configs/examples/config.toml.example packages/runner/configs/config.toml && echo 'done.' || echo 'do nothing'; 
    [ ! -e packages/runner/configs/godwoken-config.json ] && cp packages/runner/configs/examples/godwoken-config.json.example packages/runner/configs/godwoken-config.json && echo 'done.' || echo 'do nothing'; 
    [ ! -e packages/runner/configs/scripts-deploy-result.json ] && cp packages/runner/configs/examples/scripts-deploy-result.json.example packages/runner/configs/scripts-deploy-result.json && echo 'done.' || echo 'do nothing'; 
    [ ! -e packages/runner/configs/lumos-config.json ] && cp packages/runner/configs/examples/lumos-config.json.example packages/runner/configs/lumos-config.json && echo 'done.' || echo 'do nothing'; 
}
