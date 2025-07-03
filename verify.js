/* ===================================================================
 *  VC 発行ユーティリティ（CommonJS）
 *  - ES256 (P-256) 鍵のみを想定
 * -----------------------------------------------------------------*/
const { SignJWT, importJWK, exportJWK, generateKeyPair } = require('jose')
const { randomBytes, createHash } = require('crypto')
const { v4: uuidv4 }              = require('uuid')

/* ---------- 簡易 Logger ------------------------------------------ */
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
const L = { debug: 0, info: 1 }
const logger = {
  debug: (...a) => L[LOG_LEVEL] <= 0 && console.log('[DEBUG]', ...a),
  info : (...a) => L[LOG_LEVEL] <= 1 && console.log('[INFO ]', ...a)
}

/* ---------- disclosure ユーティリティ -----------------------------*/
function makeDisclosure (key, value) {
  const salt = randomBytes(16).toString('base64url')
  const arr  = [salt, key, value]
  const disc = Buffer.from(JSON.stringify(arr)).toString('base64url')
  const digest = createHash('sha256').update(disc, 'ascii')
                   .digest().toString('base64url')
  logger.debug(`  • hidden "${key}" → digest ${digest}`)
  return { disclosure: disc, digest }
}

/* =================================================================
 * 1) SD-JWT VC （選択的開示）
 * -----------------------------------------------------------------*/
async function issueSdJwtVcJsonLd (issuerJwk, holderJwk, {
  hidden   = {},                  // 選択的開示するフィールド
  revealed = {},                  // 常に公開するフィールド
  vct      = 'https://example.com/credential/base',
  ctx      = [
    'https://www.w3.org/2018/credentials/v1',
    'https://w3id.org/vaccination/v1'
  ],
  lifetime = 3600                 // 既定 1 時間
} = {}) {
  logger.info('▶ issueSdJwtVcJsonLd called')
  const now = Math.floor(Date.now() / 1e3)
  const exp = now + lifetime

  /* disclosure & digest */
  const disclosures = []
  const digests     = []
  for (const [k, v] of Object.entries(hidden)) {
    const { disclosure, digest } = makeDisclosure(k, v)
    disclosures.push(disclosure)
    digests.push(digest)
  }

  /* ペイロード */
  const payload = {
    '@context': ctx,
    type: ['VerifiableCredential', 'vc+sd-jwt'],
    credentialSubject: {
      id: `did:jwk:${holderJwk.kid}`,
      expirationDate: new Date(exp * 1000).toISOString(),
      _sd: digests,
      ...revealed                    // 常時公開フィールド
    },
    id : uuidv4(),
    nbf: now,
    exp,
    sub: 'did:web:example.com:holder',
    issuer       : 'did:web:example.com:issuer',
    issuanceDate : new Date(now * 1000).toISOString(),
    expirationDate: new Date(exp * 1000).toISOString(),
    iss : 'did:web:example.com:issuer',
    cnf : { jwk: { ...holderJwk, d: undefined } },
    vct,
    display: [],
    _sd_alg: 'sha-256',
    _sd    : digests
  }

  const jws = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: issuerJwk.kid, typ: 'vc+sd-jwt' })
    .sign(await importJWK(issuerJwk, 'ES256'))

  const presentation = [jws, ...disclosures].join('~')
  logger.info('✔ SD-JWT VC Presentation generated')
  return { presentation, disclosures }
}

/* =================================================================
 * 2) JWT VC（全項目公開、選択的開示なし）
 * -----------------------------------------------------------------*/
async function issueJwtVcJsonLd (issuerJwk, holderJwk, {
  claims   = {},                  // 追加したい VC クレーム
  vct      = 'https://example.com/credential/base',
  ctx      = ['https://www.w3.org/2018/credentials/v1'],
  lifetime = 3600
} = {}) {
  logger.info('▶ issueJwtVcJsonLd called')
  const now = Math.floor(Date.now() / 1e3)
  const exp = now + lifetime

  const payload = {
    '@context': ctx,
    type: ['VerifiableCredential', 'vc+jwt'],        // ← typ は JWS header にも設定
    credentialSubject: {
      id: `did:jwk:${holderJwk.kid}`,
      ...claims                                      // 全て即時公開
    },
    id : uuidv4(),
    nbf: now,
    exp,
    sub: 'did:web:example.com:holder',
    issuer       : 'did:web:example.com:issuer',
    issuanceDate : new Date(now * 1000).toISOString(),
    expirationDate: new Date(exp * 1000).toISOString(),
    iss : 'did:web:example.com:issuer',
    cnf : { jwk: { ...holderJwk, d: undefined } },
    vct,
    display: []
  }

  const jws = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: issuerJwk.kid, typ: 'vc+jwt' })
    .sign(await importJWK(issuerJwk, 'ES256'))

  logger.info('✔ JWT VC generated')
  return jws
}

/* =================================================================
 *  デモ：両方の VC を発行
 * -----------------------------------------------------------------*/
(async () => {
  /* ダミー鍵生成 */
  const makeKey = async () => {
    const { privateKey } = await generateKeyPair('ES256')
    const jwk = await exportJWK(privateKey)
    Object.assign(jwk, { alg: 'ES256', use: 'sig', kid: uuidv4() })
    return jwk
  }
  const issuerJwk = await makeKey()
  const holderJwk = await makeKey()

  /* 1) SD-JWT VC */
  const { presentation, disclosures } = await issueSdJwtVcJsonLd(
    issuerJwk,
    holderJwk,
    {
      revealed: { degree: 'Master' },
      hidden  : { name: '山田太郎', address: 'Tokyo', birthdate: '1990-01-01' }
    }
  )
  console.log('\n=== SD-JWT VC (Presentation) ===\n')
  console.log(presentation)
  console.log('\n--- 全 disclosures ---\n', disclosures)

  /* 2) JWT VC */
  const jwtVc = await issueJwtVcJsonLd(
    issuerJwk,
    holderJwk,
    {
      claims: { name: '山田太郎', address: 'Tokyo', birthdate: '1990-01-01' }
    }
  )
  console.log('\n=== 通常 JWT VC ===\n')
  console.log(jwtVc)
})()

module.exports = {
  issueSdJwtVcJsonLd,
  issueJwtVcJsonLd
}
