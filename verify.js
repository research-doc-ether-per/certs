const fetchService = require('./fetch-service')
const logger = require('../utils/logger')

/**
 * Credential Profile を取得する。
 */
const getProfile = async (
  profileId,
  accessToken = null
) => {
  logger.debug('*** getProfile start ***')

  try {
    const response = await fetchService.handleGet(
      fetchService.issuerApi2,
      `/issuer2/profiles/${encodeURIComponent(profileId)}`,
      accessToken
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getProfile end ***')
  }
}

/**
 * Credential Offer を作成する。
 */
const createCredentialOffer = async (
  {
    profileId,
    credentialData = null,
    authMethod = 'PRE_AUTHORIZED',
    valueMode = 'BY_REFERENCE',
  },
  accessToken = null
) => {
  logger.debug('*** createCredentialOffer start ***')

  try {
    const params = {
      profileId,
      authMethod,
      valueMode,
    }

    if (credentialData) {
      params.runtimeOverrides = {
        credentialData,
      }
    }

    const response = await fetchService.handlePost(
      fetchService.issuerApi2,
      '/issuer2/credential-offers',
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** createCredentialOffer end ***')
  }
}

module.exports = {
  getProfile,
  createCredentialOffer,
}



/**
 * Credential Offer を解析する。
 */
const resolveCredentialOffer = async (
  walletId,
  offerUrl,
  accessToken = null
) => {
  logger.debug('*** resolveCredentialOffer start ***')

  try {
    const params = {
      offerUrl,
    }

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/receive/resolve-offer`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** resolveCredentialOffer end ***')
  }
}

/**
 * Credential Offer から Credential を取得する。
 */
const receiveCredential = async (
  walletId,
  offerUrl,
  did,
  keyId = null,
  accessToken = null
) => {
  logger.debug('*** receiveCredential start ***')

  try {
    const params = {
      offerUrl,
      did,
    }

    if (keyId) {
      params.keyId = keyId
    }

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/receive`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** receiveCredential end ***')
  }
}

/**
 * Wallet に保存されている Credential 一覧を取得する。
 */
const getCredentials = async (
  walletId,
  accessToken = null
) => {
  logger.debug('*** getCredentials start ***')

  try {
    const response = await fetchService.handleGet(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials`,
      accessToken
    )

    const result = response.data || []

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getCredentials end ***')
  }
}


module.exports = {
  resolveCredentialOffer,
  receiveCredential,
  getCredentials,
}


// openid4vci-credential-issue.js
const issuer2Service = require('./services/issuer2-service')
const wallet2Service = require('./services/wallet2-service')
const logger = require('./utils/logger')

const WALLET_ID = 'Wallet IDを指定'
const HOLDER_DID = 'Holder DIDを指定'
const HOLDER_KEY_ID = null

/**
 * 発行対象の Credential を定義する。
 *
 * key   : Issuer2 の profileId
 * value : 発行時に上書きする credentialData
 */
const credentialMap = new Map([
  [
    'Profile ID 1',
    {
      given_name: 'Taro',
      family_name: 'Yamada',
      birth_date: '1990-01-01',
    },
  ],
  [
    'Profile ID 2',
    {
      given_name: 'Hanako',
      family_name: 'Yamada',
      birth_date: '1992-05-01',
    },
  ],
])

/**
 * Credential Profile を確認する。
 */
const checkCredentialProfile = async (
  profileId
) => {
  logger.debug('Credential Profile を確認します。')
  logger.debug('profileId : ', profileId)

  const profile =
    await issuer2Service.getProfile(
      profileId
    )

  if (!profile || !profile.profileId) {
    throw new Error(
      `Credential Profile が存在しません: ${profileId}`
    )
  }

  logger.debug('Credential Profile : ')
  logger.debug(
    JSON.stringify(profile, null, 2)
  )

  return profile
}

/**
 * Credential Offer を作成する。
 */
const createCredentialOffer = async (
  profileId,
  credentialData
) => {
  logger.debug(
    'Credential Offer を作成します。'
  )

  const offer =
    await issuer2Service.createCredentialOffer({
      profileId,
      credentialData,
      authMethod: 'PRE_AUTHORIZED',
      valueMode: 'BY_REFERENCE',
    })

  if (!offer || !offer.credentialOffer) {
    throw new Error(
      `Credential Offer の作成に失敗しました: ${profileId}`
    )
  }

  logger.debug(
    'Credential Offer 作成結果 : '
  )
  logger.debug(
    JSON.stringify(offer, null, 2)
  )

  return offer
}

/**
 * Wallet で Credential Offer を解析する。
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

  logger.debug(
    'Credential Offer 詳細 : '
  )
  logger.debug(
    JSON.stringify(offerDetail, null, 2)
  )

  return offerDetail
}

/**
 * Holder DID を指定して Credential を取得する。
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

  logger.debug(
    'Holder 情報を確認します。'
  )
  logger.debug(
    'holderDid : ',
    holderDid
  )

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

  logger.debug(
    'Credential 取得結果 : '
  )
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
 * Credential を発行する。
 */
const issueCredential = async ({
  walletId,
  holderDid,
  holderKeyId,
  profileId,
  credentialData,
}) => {
  logger.debug(
    `*** issueCredential start: ${profileId} ***`
  )

  try {
    // Credential Profile を確認
    const profile =
      await checkCredentialProfile(
        profileId
      )

    // Credential Offer を作成
    const offer =
      await createCredentialOffer(
        profileId,
        credentialData
      )

    const offerUrl =
      offer.credentialOffer

    // Credential Offer を解析
    const offerDetail =
      await resolveCredentialOffer(
        walletId,
        offerUrl
      )

    // Holder DID を指定して Credential を取得
    const receiveResult =
      await receiveCredential(
        walletId,
        offerUrl,
        holderDid,
        holderKeyId
      )

    return {
      profileId,
      profile,
      offer,
      offerDetail,
      credentialIds:
        receiveResult.credentialIds || [],
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
 * OpenID4VCI Credential 発行処理を実行する。
 */
const main = async () => {
  logger.debug('*** main start ***')

  try {
    const results = []

    for (
      const [profileId, credentialData]
      of credentialMap
    ) {
      logger.debug(
        `Credential 発行処理を開始します。profileId: ${profileId}`
      )

      const result =
        await issueCredential({
          walletId: WALLET_ID,
          holderDid: HOLDER_DID,
          holderKeyId: HOLDER_KEY_ID,
          profileId,
          credentialData,
        })

      results.push(result)
    }

    // Wallet に保存された Credential を確認
    logger.debug(
      'Wallet に保存された Credential を確認します。'
    )

    const credentials =
      await wallet2Service.getCredentials(
        WALLET_ID
      )

    logger.debug(
      'Credential 一覧 : '
    )
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
      'OpenID4VCI 実行結果 : '
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
    logger.debug('*** main end ***')
  }
}

main()
