
/**
 * SD-JWTを解析する。
 * @param {string} signedWithDisclosures SD-JWT文字列
 * @returns {Object} 解析結果
 */
const parseSdJwt = (signedWithDisclosures) => {
    if (typeof signedWithDisclosures !== 'string' || !signedWithDisclosures) {
        throw new Error('signedWithDisclosures is required.')
    }

    // Base64URLデコード
    const decodeBase64Url = (value) => {
        return Buffer.from(value, 'base64url').toString('utf8')
    }

    // JWTを解析
    const parseJwt = (jwt) => {
        const parts = jwt.split('.')

        if (parts.length !== 3) {
            throw new Error('Invalid JWT format.')
        }

        return {
            header: JSON.parse(decodeBase64Url(parts[0])),
            payload: JSON.parse(decodeBase64Url(parts[1])),
            signature: parts[2],
        }
    }

    // SD-JWTを分割
    const parts = signedWithDisclosures.split('~')
    const signed = parts[0]

    const jwt = parseJwt(signed)

    // DisclosureとKey Binding JWTを分離
    const remaining = parts.slice(1)
    let keyBindingJwt = null

    if (remaining.length > 0) {
        const last = remaining[remaining.length - 1]

        if (last && last.split('.').length === 3) {
            keyBindingJwt = last
            remaining.pop()
        }
    }

    // Disclosureを解析
    const disclosures = remaining
        .filter(Boolean)
        .map((encoded) => {
            const decoded = JSON.parse(decodeBase64Url(encoded))

            return {
                encoded,
                salt: decoded[0],
                key: decoded.length === 3 ? decoded[1] : null,
                value: decoded.length === 3 ? decoded[2] : decoded[1],
            }
        })

    return {
        signed,
        header: jwt.header,
        payload: jwt.payload,
        disclosures,
        keyBindingJwt,
    }
}
