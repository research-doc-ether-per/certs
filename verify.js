/**
 * APIテンプレートパスと実リクエストパスが一致するかを判定する
 *
 * 判定ルール：
 * - セグメント数が完全一致していること
 * - テンプレート側が ":param" の場合は任意の1セグメントと一致
 * - 静的セグメントは完全一致必須
 *
 * @param {string[]} templateSegs
 *   テンプレートパスのセグメント配列
 
 * @param {string[]} requestSegs
 *   実リクエストパスのセグメント配列
 *
 * @returns {boolean}
 *   true  : テンプレートとリクエストが一致
 *   false : 不一致
 */


 // 動的パラメータ（:userId 等）は任意一致
 // 静的セグメントは完全一致必須

/**
 * api-meta.json のキー文字列を解析し、
 * HTTPメソッドとテンプレートパスに分解する
 *
 *
 * @param {string} key
 *   api-meta.json のキー文字列
 *
 * @returns {{
 *   method: string|null,
 *   templatePath: string|null
 * }}
 *   - 正常時 : { method, templatePath }
 *   - 不正フォーマット時 : { method: null, templatePath: null }
 */

// 先頭の "METHOD_" を切り出す

/**
 * api-meta.json の定義を内部ルール形式に変換する
 */

/**
 * リクエスト情報から APIメタ情報（apiId / apiName）を解決する
 *
 * @param {import("express").Request} req
 *   Express の Request オブジェクト
 *
 * @returns {{
 *   apiId: string|null,
 *   apiName: string|null
 * }}
 *   - 一致した場合 : 設定ファイル上の APIメタ情報
 *   - 未一致の場合 : { apiId: null, apiName: null }
 */


 // query除外済み

  // 設定未定義 / 404 等
