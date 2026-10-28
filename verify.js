
/**
 * Credential Dataのデフォルト値の有無を確認する。
 */
const hasCredentialDefaultValue = (value) => {
    if (value === null || value === undefined) {
        return false
    }

    if (typeof value === 'string') {
        const str = value.trim()

        return str !== '' &&
            str !== 'string' &&
            str !== 'null' &&
            str !== 'THIS WILL BE REPLACED WITH DYNAMIC DATA FUNCTION'
    }

    return true
}

/**
 * Credential Dataの値からフィールドタイプを取得する。
 */
const getFieldType = (value) => {
    if (typeof value === 'number') {
        return 'number'
    }

    if (typeof value === 'boolean') {
        return 'boolean'
    }

    if (Array.isArray(value)) {
        return 'array'
    }

    if (value !== null && typeof value === 'object') {
        return 'object'
    }

    return 'text'
}

/**
 * オブジェクトかどうかを確認する。
 */
const isPlainObject = (value) => {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
}

/**
 * システム項目かどうかを確認する。
 */
const isSystemField = (path) => {
    if (path.length === 1) {
        return CREDENTIAL_SYSTEM_FIELDS.includes(path[0])
    }

    return path.length === 2 &&
        path[0] === 'credentialSubject' &&
        path[1] === 'id'
}

/**
 * DBのフィールド定義かどうかを確認する。
 */
const isFieldDefinition = (value) => {
    if (!isPlainObject(value)) {
        return false
    }

    return [
        'type',
        'required',
        'length',
        'format',
        'issueFormat',
        'showInDetail',
        'showInIssue',
        'isDisclosure'
    ].some(key => Object.hasOwn(value, key))
}

/**
 * Credential Issuer MetadataからClaim情報を取得する。
 */
const getClaimMetadata = (claims, path, format) => {
    if (!Array.isArray(claims)) {
        return null
    }

    const paths = [path]

    // SD-JWT VCのClaimパスを考慮する。
    if (
        format === WALTID_FORMAT_TYPES.SD_JWT_VC &&
        path[0] === 'credentialSubject'
    ) {
        paths.push(path.slice(1))
    }

    return claims.find(claim => {
        if (!Array.isArray(claim.path)) {
            return false
        }

        return paths.some(candidate =>
            candidate.length === claim.path.length &&
            candidate.every((key, index) =>
                key === claim.path[index]
            )
        )
    }) || null
}

/**
 * Selective Disclosureの設定を取得する。
 */
const getDisclosureValue = (selectiveDisclosure, path) => {
    let current = selectiveDisclosure?.fields || {}

    for (const key of path) {
        current = current?.[key] ||
            current?.children?.fields?.[key]

        if (!current) {
            return false
        }
    }

    return current?.sd === true
}

/**
 * Credential Data、DB定義、Metadataを統合する。
 */
const mergeCredentialFields = (
    credentialData = {},
    selectiveDisclosure = null,
    formatFields = {},
    claims = [],
    format = null
) => {
    logger.debug('*** mergeCredentialFields start ***')

    try {
        /**
         * フィールド定義を再帰的に生成する。
         */
        const mergeFields = (data, db, path = []) => {
            const result = {}

            const profileData = isPlainObject(data)
                ? data
                : {}

            const dbData = isPlainObject(db)
                ? db
                : {}

            // ProfileとDBの項目を統合する。
            const keys = new Set([
                ...Object.keys(profileData),
                ...Object.keys(dbData)
            ])

            for (const key of keys) {
                const currentPath = [...path, key]

                // システム項目を除外する。
                if (isSystemField(currentPath)) {
                    continue
                }

                const hasProfileValue =
                    Object.hasOwn(profileData, key)

                const value = profileData[key]
                const dbValue = dbData[key]

                // ネストされた項目を再帰的に処理する。
                if (
                    !isFieldDefinition(dbValue) &&
                    (
                        (
                            isPlainObject(value) &&
                            !isFieldDefinition(value)
                        ) ||
                        (
                            !hasProfileValue &&
                            isPlainObject(dbValue)
                        )
                    )
                ) {
                    result[key] = mergeFields(
                        value,
                        dbValue,
                        currentPath
                    )
                    continue
                }

                const dbDefinition = isFieldDefinition(dbValue)
                    ? dbValue
                    : {}

                // Metadataから表示情報を取得する。
                const claim = getClaimMetadata(
                    claims,
                    currentPath,
                    format
                )

                // フィールドの基本情報を生成する。
                const field = {
                    type: getFieldType(value),
                    required: false,
                    hasDefaultValue: hasProfileValue &&
                        hasCredentialDefaultValue(value),
                    showInDetail: true,
                    showInIssue: true
                }

                // Metadataの表示情報を設定する。
                if (Array.isArray(claim?.display)) {
                    field.display = claim.display
                }

                // 開示対象の場合のみ設定する。
                if (
                    getDisclosureValue(
                        selectiveDisclosure,
                        currentPath
                    )
                ) {
                    field.isDisclosure = true
                }

                // DBの定義を優先して統合する。
                const mergedField = {
                    ...field,
                    ...dbDefinition
                }

                // 開示対象以外はisDisclosureを返却しない。
                if (mergedField.isDisclosure !== true) {
                    delete mergedField.isDisclosure
                }

                result[key] = mergedField
            }

            return result
        }

        return mergeFields(
            credentialData,
            formatFields
        )
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** mergeCredentialFields end ***')
    }
}

/**
 * 証明書フォーマット定義取得サービス
 * @param {object} params パラメータ
 * @returns {Promise<object>}
 */
const getCredentialFormat = async (params) => {
    logger.debug('*** getCredentialFormat start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    try {
        const { groupId, type, format } = params

        let rows = []

        // 指定されたグループIDで検索する。
        if (
            groupId &&
            groupId.trim() &&
            groupId.trim() !== ALL_SETTING
        ) {
            rows = await walletDBService.select(
                'credential_formats',
                {
                    group_id: groupId.trim(),
                    type,
                    format
                }
            )
        }

        // 該当データがない場合、allで検索する。
        if (rows.length === 0) {
            rows = await walletDBService.select(
                'credential_formats',
                {
                    group_id: ALL_SETTING,
                    type,
                    format
                }
            )
        }

        // DBのフィールド定義を取得する。
        const rawFields = rows?.[0]?.fields || {}

        const formatJson = typeof rawFields === 'string'
            ? JSON.parse(rawFields)
            : rawFields

        const dbFields = formatJson?.fields || {}

        // 認証方式を取得する。
        const authType =
            rows?.[0]?.authType ??
            rows?.[0]?.auth_type

        const authTypes = createAuthMethodTypeList(authType)

        let fields = dbFields
        let image = images?.default || null

        // 証明書種別とフォーマットが指定された場合
        if (type && format) {
            // Cloud WalletのFormatをwalt.id形式に変換する。
            const waltidFormat =
                format === FORMAT_TYPES.VC_SD_JWT
                    ? WALTID_FORMAT_TYPES.SD_JWT_VC
                    : format

            // Credential Configuration IDを生成する。
            const credentialConfigurationId =
                `${type}_${waltidFormat}`

            // Credential ProfileとIssuer Metadataを取得する。
            const [profile, metadata] = await Promise.all([
                getCredentialProfileByConfigurationId(
                    credentialConfigurationId
                ),
                getCredentialIssuerMetadata()
            ])

            // Credential Configuration情報を取得する。
            const configuration =
                metadata?.credential_configurations_supported
                    ?.[credentialConfigurationId]

            if (!configuration) {
                throw new Error(
                    `Credential Configuration not found: ${credentialConfigurationId}`
                )
            }

            // Credential Profile情報を取得する。
            const credentialData =
                profile.credentialData || {}

            const selectiveDisclosure =
                profile.selectiveDisclosure || null

            // MetadataのClaims情報を取得する。
            const claims =
                configuration.credential_metadata?.claims || []

            // Credential Data、DB定義、Metadataを統合する。
            fields = mergeCredentialFields(
                credentialData,
                selectiveDisclosure,
                dbFields,
                claims,
                waltidFormat
            )

            // Credential Dataの画像を取得する。
            const credentialImage =
                credentialData.credentialSubject?.image

            image = credentialImage || images?.default || null
        }

        return {
            fields,
            image,
            authTypes
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getCredentialFormat end ***')
    }
}
