/**
 * 組織 Wallet 認証情報生成用のハッシュ値を生成する
 *
 * @param {string} value
 * Access Token の iss と組織 Wallet ID を連結した文字列
 *
 * @returns {string}
 * SHA-256 でハッシュ化した 16 進数文字列
 */
const createHash = (value) => {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
}
