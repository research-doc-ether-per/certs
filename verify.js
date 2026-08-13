
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
  if (!cfg) {
    return null
  }

  if (!Array.isArray(cfg)) {
    return cfg
  }

  const azp = payload?.azp
  const aud = payload?.aud
  const audList = Array.isArray(aud) ? aud : [aud].filter(Boolean)

  return (
    cfg.find((item) => {
      const clientID = item.clientID
      const allowedCallerClientIDs =
        allowedCallerClientConfig[clientID] || []

      return (
        // 対象 client 自身が token を取得した場合
        clientID === azp ||

        // token の audience に対象 client が含まれる場合
        audList.includes(clientID) ||

        // 許可された呼び出し元 client からのアクセスの場合
        allowedCallerClientIDs.includes(azp)
      )
    }) || null
  )
}
