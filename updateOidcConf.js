
const fs = require('fs');
const path = './AuthenticationServiceConfig.kt';

// 读取文件
let content = fs.readFileSync(path, 'utf-8');

// 替换字段
content = content
  .replace(/authorizeUrl: String = ".*?"/, 'authorizeUrl: String = "https://your-new-host/auth"')
  .replace(/accessTokenUrl: String = ".*?"/, 'accessTokenUrl: String = "https://your-new-host/token"')
  .replace(/clientId: String = ".*?"/, 'clientId: String = "new_client_id"')
  .replace(/clientSecret: String = ".*?"/, 'clientSecret: String = "new_client_secret"');

// 写回文件
fs.writeFileSync(path, content, 'utf-8');

console.log('更新完成');
