const issuer2Service = require('./services/issuer2-service')
const wallet2Service = require('./services/wallet2-service')
const logger = require('./utils/logger')

const WALLET_ID = 'Wallet IDを指定'
const HOLDER_DID = 'Holder DIDを指定'
const HOLDER_KEY_ID = null

/**
 * Credential 発行設定
 *
 * Key   : Credential Profile ID
 * Value : Credential Offer 作成時の runtimeOverrides
 */
const credentialMap = new Map([
  [
    'Awards',
    {
      credentialData: {
        credentialSubject: {
          id: HOLDER_DID,
          name: 'Taro Yamada',
          award: 'Gold Award',
          year: 2026,
        },
      },

      selectiveDisclosure: {
        fields: {
          credentialSubject: {
            sd: false,
            children: {
              fields: {
                id: {
                  sd: false,
                },
                name: {
                  sd: true,
                },
                award: {
                  sd: true,
                },
                year: {
                  sd: false,
                },
              },
              decoyMode: 'NONE',
              decoys: 0,
            },
          },
        },
        decoyMode: 'NONE',
        decoys: 0,
      },

      issuerDid: null,
      issuerKey: null,
      mapping: null,
      x5Chain: null,
    },
  ],

  [
    'Awards_jwt_vc_json',
    {
      credentialData: {
        credentialSubject: {
          id: HOLDER_DID,
          name: 'Taro Yamada',
          award: 'Silver Award',
          year: 2026,
        },
      },

      selectiveDisclosure: null,

      issuerDid: null,
      issuerKey: null,
      mapping: null,
      x5Chain: null,
    },
  ],
])

/**
 * Credential Profile を確認する。
 */
const checkCredentialProfile = async (profileId) => {
  logger.debug('Credential Profile を確認します。')
  logger.debug('profileId : ', profileId)

  const profile = await issuer2Service.getProfile(profileId)

  if (!profile || !profile.profileId) {
    throw new Error(
      `Credential Profile が存在しません: ${profileId}`
    )
  }

  logger.debug('Credential Profile : ')
  logger.debug(JSON.stringify(profile, null, 2))

  return profile
}

/**
 * Credential Offer を作成する。
 */
const createCredentialOffer = async (
  profileId,
  config
) => {
  logger.debug('Credential Offer を作成します。')

  const offer = await issuer2Service.createCredentialOffer({
    profileId,

    authMethod:
      issuer2Service.AUTH_METHOD.PRE_AUTHORIZED,

    valueMode: 'BY_REFERENCE',

    credentialData:
      config.credentialData ?? null,

    selectiveDisclosure:
      config.selectiveDisclosure ?? null,

    issuerDid:
      config.issuerDid ?? null,

    issuerKey:
      config.issuerKey ?? null,

    mapping:
      config.mapping ?? null,

    x5Chain:
      config.x5Chain ?? null,
  })

  if (!offer || !offer.credentialOffer) {
    throw new Error(
      `Credential Offer の作成に失敗しました: ${profileId}`
    )
  }

  logger.debug('Credential Offer 作成結果 : ')
  logger.debug(JSON.stringify(offer, null, 2))

  return offer
}

/**
 * Credential Offer を解析する。
 */
const resolveCredentialOffer = async (
  walletId,
  offerUrl
) => {
  logger.debug(
    'Wallet で Credential Offer を解析します。'
  )

  const offerDetail =
    await wallet2Service.resolveCredentialOffer(
      walletId,
      offerUrl
    )

  if (!offerDetail) {
    throw new Error(
      'Credential Offer の解析に失敗しました。'
    )
  }

  logger.debug('Credential Offer 詳細 : ')
  logger.debug(
    JSON.stringify(offerDetail, null, 2)
  )

  return offerDetail
}

/**
 * Credential を取得する。
 */
const receiveCredential = async (
  walletId,
  offerUrl,
  holderDid,
  holderKeyId
) => {
  if (!holderDid) {
    throw new Error(
      'Holder DID が指定されていません。'
    )
  }

  logger.debug('Holder 情報を確認します。')
  logger.debug('holderDid : ', holderDid)

  if (holderKeyId) {
    logger.debug(
      'holderKeyId : ',
      holderKeyId
    )
  }

  logger.debug(
    'Credential を取得します。'
  )

  const receiveResult =
    await wallet2Service.receiveCredential(
      walletId,
      offerUrl,
      holderDid,
      holderKeyId
    )

  if (!receiveResult) {
    throw new Error(
      'Credential の取得に失敗しました。'
    )
  }

  logger.debug('Credential 取得結果 : ')
  logger.debug(
    JSON.stringify(receiveResult, null, 2)
  )

  const credentialIds =
    receiveResult.credentialIds || []

  if (credentialIds.length === 0) {
    throw new Error(
      '取得した Credential が存在しません。'
    )
  }

  return receiveResult
}

/**
 * Credential の詳細を確認する。
 */
const getCredentialDetails = async (
  walletId,
  credentialIds
) => {
  const credentials = []

  for (const credentialId of credentialIds) {
    const credential =
      await wallet2Service.getCredential(
        walletId,
        credentialId
      )

    logger.debug(
      `Credential 詳細: ${credentialId}`
    )
    logger.debug(
      JSON.stringify(credential, null, 2)
    )

    credentials.push(credential)
  }

  return credentials
}

/**
 * Credential を発行する。
 */
const issueCredential = async ({
  walletId,
  holderDid,
  holderKeyId,
  profileId,
  config,
}) => {
  logger.debug(
    `*** issueCredential start: ${profileId} ***`
  )

  try {
    const profile =
      await checkCredentialProfile(profileId)

    const offer =
      await createCredentialOffer(
        profileId,
        config
      )

    const offerUrl = offer.credentialOffer

    const offerDetail =
      await resolveCredentialOffer(
        walletId,
        offerUrl
      )

    const receiveResult =
      await receiveCredential(
        walletId,
        offerUrl,
        holderDid,
        holderKeyId
      )

    const credentialIds =
      receiveResult.credentialIds || []

    const credentials =
      await getCredentialDetails(
        walletId,
        credentialIds
      )

    return {
      profileId,
      profile,
      offer,
      offerDetail,
      credentialIds,
      credentials,
      deferredTransactionIds:
        receiveResult.deferredTransactionIds || {},
    }
  } catch (error) {
    logger.error(
      `Credential 発行に失敗しました。profileId: ${profileId}`
    )
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
    logger.debug(
      `*** issueCredential end: ${profileId} ***`
    )
  }
}

/**
 * Main
 */
const main = async () => {
  logger.debug(
    '*** OpenID4VCI PRE_AUTHORIZED start ***'
  )

  try {
    const results = []

    for (const [profileId, config] of credentialMap) {
      logger.debug(
        `Credential 発行処理を開始します。profileId: ${profileId}`
      )

      const result =
        await issueCredential({
          walletId: WALLET_ID,
          holderDid: HOLDER_DID,
          holderKeyId: HOLDER_KEY_ID,
          profileId,
          config,
        })

      results.push(result)
    }

    logger.debug(
      'Wallet に保存された Credential を確認します。'
    )

    const credentials =
      await wallet2Service.getCredentials(
        WALLET_ID
      )

    logger.debug('Credential 一覧 : ')
    logger.debug(
      JSON.stringify(credentials, null, 2)
    )

    const result = {
      walletId: WALLET_ID,
      holderDid: HOLDER_DID,
      holderKeyId: HOLDER_KEY_ID,
      issuanceResults: results,
      credentials,
    }

    logger.debug(
      'OpenID4VCI PRE_AUTHORIZED 実行結果 : '
    )
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
    logger.debug(
      '*** OpenID4VCI PRE_AUTHORIZED end ***'
    )
  }
}

main()
