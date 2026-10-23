// JSON 文字列の解析
const parseJson = (value) => {
    if (!value) {
        return null
    }

    if (typeof value === 'object') {
        return value
    }

    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

// オブジェクトから JWK を取得
const findJwk = (value) => {
    const obj = parseJson(value)

    if (!obj || typeof obj !== 'object') {
        return null
    }

    if (obj.kty) {
        return obj
    }

    if (obj.jwk?.kty) {
        return obj.jwk
    }

    if (obj.publicKeyJwk?.kty) {
        return obj.publicKeyJwk
    }

    if (obj.key?.kty) {
        return obj.key
    }

    if (obj.key?.jwk?.kty) {
        return obj.key.jwk
    }

    for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') {
            const jwk = findJwk(value)

            if (jwk) {
                return jwk
            }
        }
    }

    return null
}

// JWK が同一鍵か確認
const isSameJwk = (a, b) => {
    if (!a || !b) {
        return false
    }

    if (a.kty !== b.kty) {
        return false
    }

    switch (a.kty) {
        case 'EC':
            return (
                a.crv === b.crv &&
                a.x === b.x &&
                a.y === b.y
            )

        case 'OKP':
            return (
                a.crv === b.crv &&
                a.x === b.x
            )

        case 'RSA':
            return (
                a.n === b.n &&
                a.e === b.e
            )

        default:
            return false
    }
}

// DID に対応する Key ID を取得
const resolveDidKeyId = (
    didRow,
    keyRows,
    defaultDid,
    defaultKeyId
) => {
    // Default DID は migration 時に対応関係を保持している
    if (
        didRow.did === defaultDid &&
        defaultKeyId
    ) {
        return defaultKeyId
    }

    const document = parseJson(didRow.document)

    if (!document) {
        return null
    }

    const verificationMethods =
        document.verificationMethod || []

    for (const method of verificationMethods) {
        const didJwk = findJwk(
            method.publicKeyJwk || method
        )

        if (!didJwk) {
            continue
        }

        for (const keyRow of keyRows) {
            const walletJwk =
                findJwk(keyRow.serialized_key)

            if (
                walletJwk &&
                isSameJwk(didJwk, walletJwk)
            ) {
                return keyRow.key_id
            }
        }
    }

    return null
}
