証明書タイプに対応するIssuer DIDを取得する。
取得したCredential Profile一覧から、以下の条件に一致するProfileを検索する。

■ 検索条件
・credentialConfigurationIdが、指定された証明書タイプ（vcType）と「_」を連結した文字列で始まること。

■ 取得情報
・Issuer DID（issuerDid）

同一の証明書タイプに複数のFormatが存在する場合は、最初に一致したProfileのissuerDidを取得する。

一致するProfileが存在しない場合、またはissuerDidが設定されていない場合は、nullを返却する。



/**
 * 証明書タイプからIssuer DIDを取得する
 * @param {string} vcType 証明書タイプ
 * @param {string|null} accessToken アクセストークン
 * @returns {Promise<string|null>} Issuer DID
 */
const getIssuerDidByVcType = async (vcType, accessToken = null) => {
    logger.debug('*** getIssuerDidByVcType start ***')

    try {
        const profiles = await getCredentialProfiles(accessToken)

        // Credential Configuration IDから証明書タイプを判定する
        const profile = profiles.find(item => {
            const configurationId = item.credentialConfigurationId

            return (
                typeof configurationId === 'string' &&
                configurationId.startsWith(`${vcType}_`)
            )
        })

        const result = profile?.issuerDid || null

        logger.debug('result : ', result)

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getIssuerDidByVcType end ***')
    }
}
