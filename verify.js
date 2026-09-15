const fs = require('fs')
const path = require('path')

const logger = require('./utils/logger')

const DID_WEB_SERVER = `
  did-web-server:
    image: nginx:alpine
    container_name: did-web-server
    ports:
      - "5101:80"
    volumes:
      - \${HOME}/workspace/cloudcredentialservice/samples/v1.0.0/output/issuerDids:/usr/share/nginx/html/dids:ro
`

/**
 * docker-compose.yaml の services に did-web-server を追加する。
 *
 * @param {string} composeFilePath docker-compose.yaml のパス
 */
const addDidWebServer = (composeFilePath) => {
  logger.debug('*** addDidWebServer start ***')

  try {
    const targetPath = path.resolve(composeFilePath)

    logger.debug('docker-compose.yaml : ', targetPath)

    if (!fs.existsSync(targetPath)) {
      throw new Error(`docker-compose.yaml が存在しません: ${targetPath}`)
    }

    let content = fs.readFileSync(targetPath, 'utf8')

    if (!/^services:\s*$/m.test(content)) {
      throw new Error('services が見つかりません。')
    }

    if (/^\s{2}did-web-server:\s*$/m.test(content)) {
      logger.debug('did-web-server は既に存在します。')
      return
    }

    const lines = content.split(/\r?\n/)

    const servicesIndex = lines.findIndex(
      line => /^services:\s*$/.test(line)
    )

    let insertIndex = lines.length

    for (let i = servicesIndex + 1; i < lines.length; i++) {
      const line = lines[i]

      if (/^[^\s#][^:]*:\s*(?:#.*)?$/.test(line)) {
        insertIndex = i
        break
      }
    }

    const didWebServerLines = DID_WEB_SERVER
      .trimEnd()
      .split('\n')

    lines.splice(
      insertIndex,
      0,
      ...didWebServerLines
    )

    content = lines.join('\n')

    fs.writeFileSync(targetPath, content, 'utf8')

    logger.debug('did-web-server を追加しました。')
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** addDidWebServer end ***')
  }
}

const composeFilePath = process.argv[2]

if (!composeFilePath) {
  console.error(
    'Usage: node docker-compose-did-web-add.js <docker-compose.yaml>'
  )
  process.exit(1)
}

addDidWebServer(composeFilePath)








const fs = require('fs')
const path = require('path')

const wallet2Service = require('./services/wallet2-service')
const logger = require('./utils/logger')

const ISSUER_ID = 'issuer01'
const DOMAIN = '10.0.2.15:5101'
const DID_PATH = `dids/${ISSUER_ID}`

const OUTPUT_PATH = path.join(
  __dirname,
  '../output/issuerDids'
)

/**
 * Issuer 用の Wallet、Key、DID を作成する。
 */
const createIssuerDid = async () => {
  logger.debug('*** createIssuerDid start ***')

  try {
    // Wallet を作成
    logger.debug('Wallet を作成します。')

    const wallet = await wallet2Service.createWallet()
    const walletId = wallet.walletId

    logger.debug('walletId : ', walletId)

    // secp256r1 Key を生成
    logger.debug('secp256r1 Key を生成します。')

    const key = await wallet2Service.generateKey(
      walletId,
      null,
      'jwk',
      'secp256r1'
    )

    const keyId = key.keyId

    logger.debug('keyId : ', keyId)

    // Default Key に設定
    logger.debug('Default Key に設定します。')

    await wallet2Service.setDefaultKey(
      walletId,
      keyId
    )

    // did:web を作成
    logger.debug('did:web を作成します。')

    const didResult = await wallet2Service.createDid(
      walletId,
      keyId,
      null,
      'web',
      {
        domain: DOMAIN,
        path: DID_PATH,
      }
    )

    const did = didResult.did

    logger.debug('did : ', did)

    // Default DID に設定
    logger.debug('Default DID に設定します。')

    await wallet2Service.setDefaultDid(
      walletId,
      did
    )

    // Wallet 情報を取得
    logger.debug('Wallet 情報を確認します。')

    const walletInfo = await wallet2Service.getWallet(
      walletId
    )

    // Key 情報を取得
    logger.debug('Key 情報を確認します。')

    const keyInfo = await wallet2Service.getKey(
      walletId,
      keyId
    )

    // DID 情報を取得
    logger.debug('DID 情報を確認します。')

    const dids = await wallet2Service.getDids(
      walletId
    )

    // 作成した DID を取得
    const didInfo = dids.find(
      item => item.did === did
    )

    if (!didInfo) {
      throw new Error(
        `作成した DID が見つかりません: ${did}`
      )
    }

    if (!didInfo.document) {
      throw new Error(
        `DID Document が存在しません: ${did}`
      )
    }

    // DID Document の出力先を作成
    const issuerOutputPath = path.join(
      OUTPUT_PATH,
      ISSUER_ID
    )

    if (!fs.existsSync(issuerOutputPath)) {
      fs.mkdirSync(
        issuerOutputPath,
        {
          recursive: true,
        }
      )
    }

    // DID Document を did.json に保存
    const didDocumentPath = path.join(
      issuerOutputPath,
      'did.json'
    )

    logger.debug(
      'DID Document を保存します。: ',
      didDocumentPath
    )

    fs.writeFileSync(
      didDocumentPath,
      JSON.stringify(didInfo.document, null, 2),
      'utf8'
    )

    const result = {
      walletId,
      keyId,
      issuerDid: did,
      defaultKeyId: walletInfo.defaultKeyId,
      defaultDidId: walletInfo.defaultDidId,
      didDocumentPath,
      key: keyInfo,
      did: didInfo,
    }

    logger.debug('Issuer DID 作成結果 : ')
    logger.debug(
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error(
      'error.message: ',
      error.message
    )
    logger.error(
      'error.stack: ',
      error.stack
    )
    throw error
  } finally {
    logger.debug('*** createIssuerDid end ***')
  }
}

createIssuerDid()






