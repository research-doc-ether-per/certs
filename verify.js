
const fields = value.fields || []

const credentialSubject = {}

for (const item of fields) {
    logger.debug('item : ', item)

    const { name, ...fieldInfo } = item

    const targetItem = {
        ...fieldInfo,
        ...config.fields.values.credentialSubject
    }

    credentialSubject[name] = targetItem
}

const tempFields = {
    credentialSubject,
    issuanceDate: config.fields.values.issuanceDate,
    expirationDate: config.fields.values.expirationDate
}

logger.debug('tempFields : ', tempFields)

// 変換後のfieldsを設定する
const result = {
    ...value,
    fields: tempFields
}

logger.debug('result : ', result)

return result

const fields = value.fields || []

const credentialSubject = {}

for (const item of fields) {
    logger.debug('item : ', item)

    const { name, ...fieldInfo } = item

    const targetItem = {
        ...fieldInfo,
        ...config.fields.values.credentialSubject
    }

    credentialSubject[name] = targetItem
}

const tempFields = {
    credentialSubject,
    issuanceDate: config.fields.values.issuanceDate,
    expirationDate: config.fields.values.expirationDate
}

logger.debug('tempFields : ', tempFields)

// 変換後のfieldsを設定する
const result = {
    ...value,
    fields: tempFields
}

logger.debug('result : ', result)

return result
