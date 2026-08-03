
/**
 * Token 情報から Keycloak client 設定を取得する
 *
 * @param {Object} params パラメータ
 * @param {Object|Object[]} params.cfg Keycloak client 設定
 * @param {Object} params.payload Access Token payload
 * @param {Object} params.allowedCallerClientConfig 呼び出し元 client 許可設定
 * @returns {Object|null} Keycloak client 設定
 */
const getKeycloakClientConfigByToken = ({
  cfg,
  payload,
  allowedCallerClientConfig = {},
}) => {
  if (!Array.isArray(cfg)) {
    return cfg
  }

  const azp = payload?.azp
  const aud = payload?.aud
  const audList = Array.isArray(aud) ? aud : [aud].filter(Boolean)

  return cfg.find((item) => {
    const allowedCallerClientIDs =
      allowedCallerClientConfig[item.clientID] || []

    return (
      item.clientID === azp ||
      audList.includes(item.clientID) ||
      allowedCallerClientIDs.includes(azp)
    )
  })
}

cfg = getKeycloakClientConfigByToken({
  cfg,
  payload,
  allowedCallerClientConfig,
})
