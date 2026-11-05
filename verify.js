
NPM_PACKAGE_UPDATE.md

# npm パッケージ更新手順

## 1. パッケージのバージョンを更新

```bash
npx npm-check-updates -u --target minor
npm install
```

## 2. 脆弱性を確認・修正

```bash
npm audit
npm audit fix
```

## 3. 未解決の脆弱性に個別対応（必要な場合）

今回の `nodemon` の場合：

```bash
npm install --save-dev --save-exact nodemon@3.1.11
```
※ 本番環境で `nodemon` を使用していないことを確認する。


## 4. 最終確認

```bash
npm audit
npm ls --depth=0
```
更新後、サービスの動作確認を行う。
