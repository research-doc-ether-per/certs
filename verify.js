
/**
 * Credential Offer URL発行サービス
 *
 * @param {object} params パラメータ
 * @returns {object} 発行結果
 */
const issueCredentialOfferUrl = async (params) => {
    logger.debug('*** issueCredentialOfferUrl start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    let result = {}

    try {
        const {
            groupId,
            offerData,
            category,
            targets,
            certName,
            endpointUrl
        } = params

        // Issuerの存在を確認する。
        const issuer = await checkIssuerExists(groupId)
        const { issuerKey, issuerDid } = issuer

        // 発行パラメータを取得する。
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

        // Credential Profileと証明書タイプを検証する。
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

        const claims = credentialMetadata?.claims || []

        // Credential Metadataから有効期限のPathを取得する。
        const expirationDatePath = getClaimPathByKey(
            claims,
            'expirationDate'
        )

        // 入力された有効期限を取得する。
        const inputExpirationDate =
            Array.isArray(expirationDatePath) &&
            expirationDatePath.length > 0
                ? getValueByPath(
                    credentialData,
                    expirationDatePath
                )
                : undefined

        // 有効期限が指定されたか確認する。
        const expirationDateSpecified =
            inputExpirationDate !== undefined

        // 発行日時と有効期限を準備する。
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

        // walt.idのFormatをCloud Wallet形式に変換する。
        let cloudWalletFormat

        switch (format) {
            case WALTID_FORMAT_TYPES.JWT_VC_JSON:
                cloudWalletFormat = FORMAT_TYPES.VC_JWT
                break

            case WALTID_FORMAT_TYPES.SD_JWT_VC:
                cloudWalletFormat = FORMAT_TYPES.VC_SD_JWT
                break

            default:
                throw new Error('Unsupported Credential format.')
        }

        let docId
        let credential_offer_url
        let endpoint = {}

        // DBトランザクションを開始する。
        await walletDBService.withTransaction(async (client) => {
            // Status Listが存在しない場合は登録する。
            if (!existsStatus) {
                await registerStatusList({
                    client,
                    groupId,
                    type: credentialType,
                    statusListUrl
                })
            }

            // 追加可能証明書テーブルに登録する。
            const insertResult = await walletDBService._insert(
                client,
                'add_cert',
                {
                    group_id: groupId,
                    category,
                    vc_info: '',
                    credential_offer_url: '',
                    issuer: issuerDid,
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

            docId = insertResult?.docId

            // Credential Offer用のPayloadを準備する。
            const payload = prepareCredentialOfferPayload({
                profile,
                credentialMetadata,
                authMethod,
                offerData,
                issuanceDate,
                expirationDate,
                expirationDateSpecified,
                docId,
                type: credentialType,
                issuerDid,
                issuerKey
            })

            // Credential Offerを作成する。
            const offerResult =
                await issuer2Service.createCredentialOffer(payload)

            // Credential Offer URLを取得する。
            credential_offer_url = offerResult.credentialOffer

            if (!credential_offer_url) {
                throw new Error('Credential Offer URL is missing.')
            }

            logger.debug(
                'credential_offer_url: ',
                credential_offer_url
            )

            // エンドポイントを検証・取得する。
            if (endpointUrl) {
                const rows = await getCredentialOfferEndpoints(
                    client,
                    groupId,
                    endpointUrl
                )

                const datas = rows.map(mapRow)

                logger.debug(
                    'datas: ',
                    JSON.stringify(datas, null, 2)
                )

                if (datas.length === 0) {
                    throw new Error(
                        `Invalid endpointUrl: ${endpointUrl}`
                    )
                }

                // Credential Offer URLのクエリ部分を取得する。
                const offerUrl = new URL(credential_offer_url)
                const queryString = offerUrl.search

                endpoint = {
                    name: datas[0].name,
                    url: `${endpointUrl}${queryString}`
                }
            }

            // Credential Offer情報を更新する。
            await walletDBService._update(
                client,
                'add_cert',
                {
                    credential_offer_url,
                    vc_info: JSON.stringify(payload),
                    credential_offer_endpoint: endpoint.url || null
                },
                {
                    doc_id: docId
                }
            )

            // 発行対象者情報を登録する。
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

        // 発行結果を設定する。
        result = {
            url: credential_offer_url,
            docId,
            endpoint
        }

        logger.debug(
            'result: ',
            JSON.stringify(result, null, 2)
        )

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** issueCredentialOfferUrl end ***')
    }
}




