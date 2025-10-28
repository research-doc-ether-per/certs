// update-env.js
// 使い方: node update-env.js
// 事前に: npm i dotenv (アプリ側で読むなら)

const fs = require('fs');
const path = require('path');

/**
 * ENV値のエスケープ関数
 * - 空白/=/#/クォート/バックスラッシュを含む場合はダブルクォートで囲み、必要なバックスラッシュ/クォートをエスケープする
 */
function escapeEnvValue(v) {
  const s = String(v ?? '');
  if (/[=\s#"'\\]/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

/**
 * .env を読み込み、指定キーの値を更新/追記して書き戻す
 * - 既存ファイルは .env.bak にバックアップ
 * - コメント行/空行は保持
 * - 同名キー行があれば置換、なければ末尾に追記
 */
function updateEnv(file = '.env', updates = {}) {
  const envPath = path.resolve(process.cwd(), file);
  const original = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = original.split(/\r?\n/);

  const keys = Object.keys(updates);
  const replaced = new Set();

  const newLines = lines.map((line) => {
    // コメント行(#...) と空行はそのまま返す
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) return line;

    // KEY=... 形式の行をキーごとに置換
    for (const k of keys) {
      const re = new RegExp(`^\\s*${k}\\s*=.*$`);
      if (re.test(line)) {
        replaced.add(k);
        return `${k}=${escapeEnvValue(updates[k])}`;
      }
    }
    return line;
  });

  // まだ置換されていないキーは末尾に追記
  for (const k of keys) {
    if (!replaced.has(k)) {
      newLines.push(`${k}=${escapeEnvValue(updates[k])}`);
    }
  }

  // バックアップ作成 → 上書き保存
  fs.writeFileSync(envPath + '.bak', original, 'utf8');
  fs.writeFileSync(envPath, newLines.join('\n') + '\n', 'utf8');

  return { envPath, backup: envPath + '.bak' };
}

// ▼ ここに更新したい値を指定（例はスクリーンショットのキー）
const result = updateEnv('.env', {
  KEYCLOAK_ISSUER:        'https://your-keycloak/realms/demo',
  KEYCLOAK_CLIENT_ID:     'your_keycloak_client',
  KEYCLOAK_CLIENT_SECRET: 'keycloak_secret',
  KEYCLOAK_REDIRECT_URI:  'https://did-register.example.com/callback',
  KEYCLOAK_PUBKEY_POINT:  'https://your-keycloak/realms/demo/protocol/openid-connect/certs',
});

console.log('更新完了:', result);

