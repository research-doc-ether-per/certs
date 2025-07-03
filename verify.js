const { SignJWT, importJWK, exportJWK, generateKeyPair } = require('jose')
const { randomBytes, createHash } = require('crypto')
const { v4: uuidv4 } = require('uuid')

/* ------------------------------------------------
 * ① disclosure 生成関数
 *    - salt, key, value を配列にまとめ
 *    - base64url エンコードした文字列を disclosure とする
 *    - その SHA-256 ハッシュを digest として返す
 * ----------------------------------------------*/
function makeDisclosure(key, value) {
    const salt = randomBytes(16).toString('base64url')
    const arr = [salt, key, value]
    const disc = Buffer.from(JSON.stringify(arr))
        .toString('base64url')
    const digest = createHash('sha256')
        .update(disc, 'ascii')
        .digest().toString('base64url')

    console.debug('  • disclosure:', disc)
    console.debug('  • digest    :', digest)
    return { disclosure: disc, digest }
}

/* ------------------------------------------------
 * ② SD-JWT VC 発行メイン関数
 *    issuerJwk : 発行者の秘密鍵 JWK（P-256, d 含む）
 *    holderJwk : 所有者の鍵 JWK    （公開鍵でも可）
 *    opts      : { hidden, vct, ctx, lifetime }
 * ----------------------------------------------*/
async function issueSdJwtVcJsonLd(issuerJwk, holderJwk, opts = {}) {
    const now = Math.floor(Date.now() / 1e3)
    const exp = now + (opts.lifetime ?? 3600)

    /* 2-1. 選択的開示にするフィールドを disclosure 化 */
    const hidden = opts.hidden ?? {}
    const disclosures = []
    const digests = []

    for (const [k, v] of Object.entries(hidden)) {
        const { disclosure, digest } = makeDisclosure(k, v)
        disclosures.push(disclosure)
        digests.push(digest)
    }

    /* 2-2. VC ペイロード（未開示部分は digest のみ格納）*/
    const payload = {
        /** JSON-LD コンテキスト */
        '@context': opts.ctx ?? [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/vaccination/v1'
        ],

        /** VC の種別 */
        type: ['VerifiableCredential', 'vc+sd-jwt'],

        /** VC 本体（credentialSubject） */
        credentialSubject: {
            id: `did:jwk:${holderJwk.kid}`,
            expirationDate: new Date(exp * 1000).toISOString(),
            _sd: digests                       // ← digest 一覧
        },

        /** メタデータ */
        id: uuidv4(),
        nbf: now,
        exp,
        sub: 'did:web:host.docker.internal%3A3201:test01',
        issuer: 'did:web:host.docker.internal%3A3201:test01',
        issuanceDate: new Date(now * 1000).toISOString(),
        expirationDate: new Date(exp * 1000).toISOString(),
        iss: 'did:web:host.docker.internal%3A3201:test01',

        /** Holder 公開鍵（d は除外）*/
        cnf: { jwk: { ...holderJwk, d: undefined } },

        /** VC 種別 URL */
        vct: opts.vct ?? 'http://host.docker.internal:7002/base_4_info',
        display: [],

        /** SD-JWT 固有フィールド */
        _sd_alg: 'sha-256',
        _sd: digests
    }

    /* 2-3. 署名して SD-JWT JWS を生成 */
    const sdJwtJws = await new SignJWT(payload)
        .setProtectedHeader({
            alg: 'ES256',
            kid: issuerJwk.kid,
            typ: 'vc+sd-jwt'
        })
        .sign(await importJWK(issuerJwk, 'ES256'))

    /* 2-4. Presentation 形式へ (JWS ~ disclosure1 ~ disclosure2 …) */
    const presentation = [sdJwtJws, ...disclosures].join('~')
    return { presentation, disclosures }
}

/* ------------------------------------------------
 * ③ デモ実行
 * ----------------------------------------------*/
(async () => {
    // 3-1. サンプル鍵生成（実運用では既存鍵を読み込む）
    const genKey = async () => {
        const { privateKey } = await generateKeyPair('ES256')
        const jwk = await exportJWK(privateKey)
        Object.assign(jwk, { alg: 'ES256', use: 'sig', kid: uuidv4() })
        return jwk
    }

    const issuerJwk = await genKey()
    const holderJwk = await genKey()
    console.debug('issuerJwk:', issuerJwk)
    console.debug('holderJwk:', holderJwk)

    // 3-2. SD-JWT VC 発行 
    const { presentation, disclosures } = await issueSdJwtVcJsonLd(
        issuerJwk,
        holderJwk,
        {
            hidden: {
                name: '山田太郎',
                address: 'Tokyo',
                birthdate: '1990-01-01'
            }
        }
    )

    console.log('\n=== SD-JWT VC Presentation ===\n')
    console.log(presentation)
    console.log('\n=== disclosures 一覧 ===\n')
    console.dir(disclosures, { depth: null })
})()

