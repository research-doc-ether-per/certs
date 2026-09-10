// setup-wallet2-auth.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const wallet2ConfigDir = path.resolve(
  __dirname,
  "../waltid-services/waltid-wallet-api2/config"
);

const authConfPath = path.join(wallet2ConfigDir, "auth.conf");
const featuresConfPath = path.join(wallet2ConfigDir, "_features.conf");

/**
 * auth.conf を生成する
 */
function generateAuthConf() {
  if (fs.existsSync(authConfPath)) {
    console.log(`auth.conf already exists: ${authConfPath}`);
    return;
  }

  const { privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  const jwk = privateKey.export({
    format: "jwk",
  });

  const authConf = `# Wallet2 の認証機能で使用する JWT Session Token の署名・検証用 Key
signingKey = {
  type = "jwk"

  jwk = {
    kty = "${jwk.kty}"
    crv = "${jwk.crv}"
    x = "${jwk.x}"
    y = "${jwk.y}"
    d = "${jwk.d}"
  }
}

# Session Token の有効期限（24時間）
tokenExpiry = "PT24H"
`;

  fs.writeFileSync(authConfPath, authConf, "utf8");

  console.log(`auth.conf generated: ${authConfPath}`);
}

/**
 * _features.conf の enabledFeatures に auth を追加する
 */
function enableAuthFeature() {
  if (!fs.existsSync(featuresConfPath)) {
    throw new Error(`_features.conf not found: ${featuresConfPath}`);
  }

  let content = fs.readFileSync(featuresConfPath, "utf8");

  // auth が既に設定されている場合は何もしない
  const enabledFeaturesMatch = content.match(
    /enabledFeatures\s*=\s*\[([\s\S]*?)\]/
  );

  if (!enabledFeaturesMatch) {
    throw new Error("enabledFeatures was not found in _features.conf");
  }

  const featuresContent = enabledFeaturesMatch[1];

  if (/\bauth\b/.test(featuresContent)) {
    console.log("auth feature is already enabled.");
    return;
  }

  const updatedFeaturesContent =
    featuresContent.replace(/\s*$/, "") + "\n    auth\n";

  content = content.replace(
    enabledFeaturesMatch[0],
    `enabledFeatures = [${updatedFeaturesContent}]`
  );

  fs.writeFileSync(featuresConfPath, content, "utf8");

  console.log("auth feature added to _features.conf.");
}

/**
 * Wallet2 Authentication Setup
 */
function main() {
  fs.mkdirSync(wallet2ConfigDir, {
    recursive: true,
  });

  generateAuthConf();
  enableAuthFeature();

  console.log("Wallet2 auth setup completed.");
}

main();
