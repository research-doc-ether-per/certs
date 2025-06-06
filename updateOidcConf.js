// updateOidcConf.js

import fs from "fs";
import path from "path";

// 1. oidc.conf のパスを指定
const confPath = path.join(__dirname, "oidc.conf");

// 2. 置き換えたい値をここで定義
const newValues = {
  oidcRealm: "http://0.0.0.0:8080/realms/my-new-realm",
  clientSecret: "mySuperSecretValue",
  keycloakUserApi: "http://0.0.0.0:8080/admin/realms/my-new-realm/users",
};

// 3. ファイルを UTF-8 で読み込む
let content = fs.readFileSync(confPath, { encoding: "utf-8" });

// 4. 正規表現で各項目を置き換える
//    ・publicBaseUrl など他の行は触らないように、
//    ・キー名 = "値" の形式を想定している
content = content
  // oidcRealm = "旧値"  →  oidcRealm = "新しいURL"
  .replace(
    /^(\s*oidcRealm\s*=\s*)"[^"]*"/m,
    `$1"${newValues.oidcRealm}"`
  )

  // clientSecret = "旧値"  →  clientSecret = "新しいシークレット"
  .replace(
    /^(\s*clientSecret\s*=\s*)"[^"]*"/m,
    `$1"${newValues.clientSecret}"`
  )

  // keycloakUserApi = "旧値"  →  keycloakUserApi = "新しいURL"
  .replace(
    /^(\s*keycloakUserApi\s*=\s*)"[^"]*"/m,
    `$1"${newValues.keycloakUserApi}"`
  );

// 5. 上書き保存
fs.writeFileSync(confPath, content, { encoding: "utf-8" });

console.log("✅ oidc.conf を更新しました。");
