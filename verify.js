
/**
 * JWT / SD-JWTを検証して解析する。
 * @param {string} signed JWTまたはSD-JWT文字列
 * @returns {Object} 解析結果
 */
const parseCredential = (signed) => {
    if (typeof signed !== 'string' || !signed.trim()) {
        throw new Error('Invalid credential format.')
    }

    // Base64URL形式チェック
    const isBase64Url = (value) => {
        return typeof value === 'string' &&
            value.length > 0 &&
            /^[A-Za-z0-9_-]+$/.test(value) &&
            value.length % 4 !== 1
    }

    // Base64URLデコード
    const decodeBase64Url = (value) => {
        if (!isBase64Url(value)) {
            throw new Error('Invalid Base64URL format.')
        }

        const buffer = Buffer.from(value, 'base64url')

        // 非正規のBase64URL文字列を拒否
        if (buffer.toString('base64url') !== value) {
            throw new Error('Invalid Base64URL encoding.')
        }

        try {
            return JSON.parse(buffer.toString('utf8'))
        } catch {
            throw new Error('Invalid JSON format.')
        }
    }

    // JWT形式チェック・解析
    const parseJwt = (jwt) => {
        const parts = jwt.split('.')

        if (
            parts.length !== 3 ||
            !parts.every(isBase64Url)
        ) {
            throw new Error('Invalid JWT format.')
        }

        const header = decodeBase64Url(parts[0])
        const payload = decodeBase64Url(parts[1])

        if (
            !header ||
            typeof header !== 'object' ||
            Array.isArray(header) ||
            !payload ||
            typeof payload !== 'object' ||
            Array.isArray(payload)
        ) {
            throw new Error('Invalid JWT header or payload.')
        }

        return {
            header,
            payload,
            signature: parts[2],
        }
    }

    // JWT / SD-JWTを分割
    const isSdJwt = signed.includes('~')
    const parts = signed.split('~')
    const jwtString = parts.shift()

    // JWTを検証・解析
    const jwt = parseJwt(jwtString)

    let keyBindingJwt = null

    if (isSdJwt) {
        // 末尾が空文字の場合はSD-JWTの終端区切り文字
        if (parts[parts.length - 1] === '') {
            parts.pop()
        } else {
            // 末尾がJWT形式の場合はKey Binding JWT
            const last = parts[parts.length - 1]

            if (last?.split('.').length === 3) {
                parseJwt(last)
                keyBindingJwt = last
                parts.pop()
            }
        }

        // 空のDisclosureを拒否
        if (parts.some((part) => !part)) {
            throw new Error('Invalid SD-JWT disclosure format.')
        }
    }

    // Disclosureを検証・解析
    const disclosures = parts.map((encoded) => {
        const decoded = decodeBase64Url(encoded)

        if (
            !Array.isArray(decoded) ||
            ![2, 3].includes(decoded.length) ||
            typeof decoded[0] !== 'string' ||
            (decoded.length === 3 &&
                typeof decoded[1] !== 'string')
        ) {
            throw new Error('Invalid Disclosure format.')
        }

        return {
            encoded,
            salt: decoded[0],
            key: decoded.length === 3 ? decoded[1] : null,
            value: decoded.length === 3
                ? decoded[2]
                : decoded[1],
        }
    })

    return {
        format: isSdJwt ? 'dc+sd-jwt' : 'jwt',
        signed: jwtString,
        header: jwt.header,
        payload: jwt.payload,
        signature: jwt.signature,
        disclosures,
        keyBindingJwt,
    }
}
