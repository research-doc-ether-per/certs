
/**
 * 発行可能証明書情報登録サービス
 *
 * @param {object} params パラメータ
 * @returns {Promise<void>}
 */
const registerIssuableCredential = async (params) => {
    logger.debug('*** registerIssuableCredential start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    try {
        const {
            groupId,
            offerData,
            category,
            targets,
            certName,
            imageData
        } = params

        // Issuerの存在を確認する。
        await checkIssuerExists(groupId)

        // 設定ファイルからIssuer情報を取得する。
        const {
            issuerKey = null,
            issuerDid = null
        } = defaultIssuerInfo || {}

        // 発行する証明書の情報を取得する。
        const {
            credentialConfigurationId,
            credentialData = {},
            authenticationMethod
        } = offerData

        const { type } = credentialData

        // 認証方式をwalt.id形式に変換する。
        const authMethod =
            issuer2Service.convertToWaltidAuthMethod(
                authenticationMethod
            )

        // Credential Profile及び証明書タイプを検証する。
        const profile =
            await issuer2Service.validateCredentialProfile(
                credentialConfigurationId,
                type
            )

        // 検証済みの証明書情報を取得する。
        const {
            type: credentialType,
            format,
            credentialMetadata
        } = profile

        // Cloud Wallet形式のFormatを取得する。
        const cloudWalletFormat =
            issuer2Service.convertToCloudWalletFormat(format)

        // Credential Metadataから有効期限のPathを取得する。
        const claims = credentialMetadata?.claims || []

        const expirationDatePath = getClaimPathByKey(
            claims,
            'expirationDate'
        )

        // リクエストから有効期限を取得する。
        const inputExpirationDate = getValueByPath(
            credentialData,
            expirationDatePath
        )

        // 有効期限の指定有無を確認する。
        const expirationDateSpecified =
            inputExpirationDate !== undefined

        // 発行日時及び有効期限を準備する。
        const {
            issuanceDate,
            expirationDate
        } = prepareCredentialDates(inputExpirationDate)

        // Status List URLを準備する。
        const {
            existsStatus,
            statusListUrl
        } = await prepareStatusListUrl({
            groupId,
            type: credentialType
        })

        // DBトランザクションを開始する。
        await walletDBService.withTransaction(async (client) => {
            // Status Listが未登録の場合は登録する。
            if (existsStatus === false) {
                if (!statusListUrl) {
                    throw new Error('Status List URL is missing.')
                }

                await registerStatusList({
                    client,
                    groupId,
                    type: credentialType,
                    statusListUrl
                })
            }

            // 追加可能証明書情報テーブルに登録する。
            const insertResult = await walletDBService._insert(
                client,
                'add_cert',
                {
                    group_id: groupId,
                    category,
                    vc_info: '',
                    issuer: issuerDid || profile.issuerDid,
                    type: credentialType,
                    format: cloudWalletFormat,
                    auth_type: authenticationMethod.toLowerCase(),
                    cert_name: certName
                }
            )

            logger.debug(
                'insertResult: ',
                JSON.stringify(insertResult, null, 2)
            )

            const docId = insertResult?.docId

            // 発行可能証明書登録用のPayloadを準備する。
            const payload = prepareIssuableCredentialPayload({
                profile,
                credentialMetadata,
                authMethod,
                offerData,
                issuanceDate,
                expirationDate,
                expirationDateSpecified,
                docId,
                type: credentialType,
                imageData,
                issuerDid,
                issuerKey
            })

            // 追加可能証明書情報を更新する。
            await walletDBService._update(
                client,
                'add_cert',
                {
                    vc_info: JSON.stringify(payload)
                },
                {
                    doc_id: docId
                }
            )

            // 発行対象者情報テーブルに登録する。
            for (const target of targets) {
                await walletDBService._insert(
                    client,
                    'add_cert_user',
                    {
                        doc_id: docId,
                        group_id: groupId,
                        user_id: target
                    }
                )
            }
        })
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** registerIssuableCredential end ***')
    }
}
