
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
const getFieldType = (key, value) => {
    // 画像項目
    if (key === 'image') {
        return 'image'
    }

    // 日付項目
    if ([
        'issuanceDate',
        'expirationDate',
        'issuedAt',
        'validFrom',
        'validUntil'
    ].includes(key)) {
        return 'datetime'
    }

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
 * Credential Dataと証明書フォーマット定義を統合する。
 */
const mergeCredentialFields = (
    credentialData = {},
    selectiveDisclosure = null,
    formatFields = []
) => {
    logger.debug('*** mergeCredentialFields start ***')

    try {
        const fieldsMap = new Map()

        const excludedFields = [
            '@context',
            'id',
            'issuer',
            'type',
            'credentialSubject'
        ]

        // Selective Disclosure情報を取得する。
        const disclosureFields =
            selectiveDisclosure?.fields
                ?.credentialSubject
                ?.children
                ?.fields || {}

        // Credential Subjectの項目を追加する。
        const credentialSubject =
            credentialData?.credentialSubject || {}

        Object.entries(credentialSubject).forEach(([key, value]) => {
            if (key === 'id') {
                return
            }

            fieldsMap.set(key, {
                key,
                type: getFieldType(key, value),
                required: false,
                isDisclosure: disclosureFields[key]?.sd === true,
                hasDefaultValue: hasCredentialDefaultValue(value)
            })
        })

        // Credential Dataのトップレベル項目を追加する。
        Object.entries(credentialData || {}).forEach(([key, value]) => {
            if (excludedFields.includes(key)) {
                return
            }

            fieldsMap.set(key, {
                key,
                type: getFieldType(key, value),
                required: false,
                isDisclosure: false,
                hasDefaultValue: hasCredentialDefaultValue(value)
            })
        })

        // DBのフォーマット定義を優先して統合する。
        formatFields.forEach(field => {
            if (!field?.key) {
                return
            }

            const existingField = fieldsMap.get(field.key) || {
                key: field.key,
                type: 'text',
                required: false,
                isDisclosure: disclosureFields[field.key]?.sd === true,
                hasDefaultValue: false
            }

            fieldsMap.set(field.key, {
                ...existingField,
                ...field
            })
        })

        return Array.from(fieldsMap.values())
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
 * @returns
 */
const getCredentialFormat = async (params) => {
    logger.debug('*** getCredentialFormat start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const { groupId, type, format } = params

    let result = {}

    try {
        let rows = []

        // 指定されたgroupIdで検索（all以外の場合）
        if (
            groupId &&
            groupId.trim() &&
            groupId.trim() !== ALL_SETTING
        ) {
            rows = await walletDBService.select('credential_formats', {
                group_id: groupId.trim(),
                type: type,
                format: format
            })
        }

        // 見つからない場合はallで検索
        if (rows.length === 0) {
            rows = await walletDBService.select('credential_formats', {
                group_id: ALL_SETTING,
                type: type,
                format: format
            })
        }

        // DBからフォーマット定義を取得する。
        const formatJson = rows?.[0]?.fields || {}
        const formatFields = Array.isArray(formatJson.fields)
            ? formatJson.fields
            : []

        const authType = rows?.[0]?.authType
        const authTypes = createAuthMethodTypeList(authType)

        let fields = formatFields
        let image = images?.default || null

        // typeとformatが指定された場合はProfile情報を取得する。
        if (type && format) {
            // Cloud WalletのFormatをwalt.idのFormatに変換する。
            const waltidFormat =
                format === FORMAT_TYPES.VC_SD_JWT
                    ? WALTID_FORMAT_TYPES.SD_JWT_VC
                    : format

            // Credential Configuration IDを生成する。
            const credentialConfigurationId =
                `${type}_${waltidFormat}`

            // Credential Profileを取得する。
            const profile = await getCredentialProfileByConfigurationId(
                credentialConfigurationId
            )

            const credentialData = profile.credentialData || {}
            const selectiveDisclosure =
                profile.selectiveDisclosure || null

            // Credential DataとDB定義を統合する。
            fields = mergeCredentialFields(
                credentialData,
                selectiveDisclosure,
                formatFields
            )

            // Credential Dataの画像デフォルト値を確認する。
            const credentialImage =
                credentialData.credentialSubject?.image

            image = hasCredentialDefaultValue(credentialImage)
                ? null
                : images?.default || null
        }

        result = {
            fields,
            image,
            authTypes
        }

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getCredentialFormat end ***')
    }
}
