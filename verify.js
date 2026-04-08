/**
 * bearerAuth 用の説明文を生成する。
 *
 * @param {Record<string, unknown> | null | undefined} schemeConfig
 *   designJson.securitySchemes.bearerAuth に定義された設定。
 *   キーには realm 名や認証グループ名、値には client 名を想定する。
 * @returns {string}
 *   Swagger UI の Authorize ダイアログに表示する説明文。
 */
const buildBearerAuthDescription = (schemeConfig) => {
  const base =
    '認証用Bearerトークンです。Swagger UI にはトークン本体のみを入力してください。`Bearer ` の接頭辞は不要です。'

  if (
    !schemeConfig ||
    typeof schemeConfig !== 'object' ||
    Array.isArray(schemeConfig)
  ) {
    return base
  }

  const details = Object.entries(schemeConfig).map(
    ([realmName, clientName]) =>
      `- ${realmName} の ${String(clientName)} クライアントでログイン後に取得したアクセストークンを使用してください。`
  )

  return [base, ...details].join('\n')
}

/**
 * designJson.securitySchemes の設定内容に基づき、
 * OpenAPI の components.securitySchemes.description を更新する。
 *
 * @param {Record<string, unknown>} openapi
 *   更新対象の OpenAPI オブジェクト。
 * @param {Record<string, unknown>} designJson
 *   API 設計情報を保持する JSON オブジェクト。
 * @returns {void}
 *   戻り値は返却しない。
 */
const applySecuritySchemeDescriptions = (openapi, designJson) => {
  if (!openapi || typeof openapi !== 'object') return
  if (!designJson || typeof designJson !== 'object') return

  const designSecuritySchemes = designJson.securitySchemes
  if (
    !designSecuritySchemes ||
    typeof designSecuritySchemes !== 'object' ||
    Array.isArray(designSecuritySchemes)
  ) {
    return
  }

  // components が未定義の場合に備えて初期化する
  openapi.components = openapi.components ?? {}

  // securitySchemes が未定義の場合に備えて初期化する
  openapi.components.securitySchemes =
    openapi.components.securitySchemes ?? {}

  for (const [schemeName, openapiScheme] of Object.entries(
    openapi.components.securitySchemes
  )) {
    if (
      !openapiScheme ||
      typeof openapiScheme !== 'object' ||
      Array.isArray(openapiScheme)
    ) {
      continue
    }

    const designSchemeConfig = designSecuritySchemes[schemeName]
    if (!designSchemeConfig) continue

    // bearerAuth の説明文を designJson の内容で上書きする
    if (schemeName === 'bearerAuth') {
      openapiScheme.description =
        buildBearerAuthDescription(designSchemeConfig)
    }
  }
}
