// update-issuers.js
// 指定された TypeScript 設定ファイル内の issuers 配列を置き換える（バックアップなし）
// 使い方: node update-issuers.js ./src/config/index.ts

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || './src/config/index.ts';

// ① 置き換える issuers 配列をここで定義
const newIssuers = [
  {
    issuerKey: {
      type: 'jwk',
      jwk: {
        kty: 'EC',
        crv: 'P-256',
        d: 'REPLACE_ME_d',
        x: 'REPLACE_ME_x',
        y: 'REPLACE_ME_y',
        kid: 'REPLACE_ME_kid',
      },
    },
    issuer_did: 'did:web:10.0.2.15%3A6102:dids:issuer01',
    verificationMethodId: 'did:web:10.0.2.15%3A6102:dids:issuer01#key-1',
    keyType: 'secp256r1',
  },
];

// ② JS オブジェクトを TS/JS リテラル文字列に整形（単一クォートに寄せる）
function toTsLiteral(obj, indent = 2) {
  return JSON.stringify(obj, null, indent).replace(/"/g, '\'');
}

// ③ 対象ファイルを読み込み
if (!fs.existsSync(filePath)) {
  console.error('Error: target file not found.');
  process.exit(1);
}
const text = fs.readFileSync(filePath, 'utf8');

// ④ issuers プロパティの位置を検出
const propIdx = text.search(/\bissuers\s*:/);
if (propIdx < 0) {
  console.error('Error: "issuers:" property not found.');
  process.exit(1);
}

// ⑤ 配列の開始 "[" と終了 "]" を対応付けて特定
const bracketStart = text.indexOf('[', propIdx);
if (bracketStart < 0) {
  console.error('Error: Missing "[" after "issuers:".');
  process.exit(1);
}
let i = bracketStart;
let depth = 0;
let bracketEnd = -1;
while (i < text.length) {
  const ch = text[i];
  if (ch === '[') depth++;
  else if (ch === ']') {
    depth--;
    if (depth === 0) { bracketEnd = i; break; }
  }
  i++;
}
if (bracketEnd < 0) {
  console.error('Error: Could not find matching closing bracket for issuers array.');
  process.exit(1);
}

// ⑥ 新しい issuers 配列で置換
const newArrayLiteral = toTsLiteral(newIssuers, 2);
const newText = text.slice(0, bracketStart) + newArrayLiteral + text.slice(bracketEnd + 1);

// ⑦ 上書き保存（バックアップ無し）
fs.writeFileSync(filePath, newText, 'utf8');

console.log('Success: issuers section updated.');
console.log('File:', path.resolve(filePath));
