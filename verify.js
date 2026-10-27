/**
 * Issuance Sessionを取得する。
 */
const getIssuanceSession = async (offerId, accessToken = null) => {
    logger.debug('*** getIssuanceSession start ***')

    try {
        const response = await fetchService.handleGet(
            fetchService.issuerApi2,
            `/issuer2/sessions/${encodeURIComponent(offerId)}`,
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
        logger.debug('*** getIssuanceSession end ***')
    }
}


/**
 * Credential Offerの有効性を確認する。
 */
const validateCredentialOffer = async (offer, accessToken = null) => {
    logger.debug('*** validateCredentialOffer start ***')

    try {
        const { offerId, expiresAt } = offer

        if (!offerId) {
            throw new Error('Offer ID is required.')
        }

        // 有効期限を確認
        if (expiresAt != null) {
            const expirationTime = Number(expiresAt)

            if (!Number.isFinite(expirationTime)) {
                throw new Error('Invalid Offer expiration time.')
            }

            if (Date.now() >= expirationTime) {
                throw new Error('Offer URL has expired.')
            }
        }

        // Issuance Sessionを取得
        const session = await getIssuanceSession(
            offerId,
            accessToken
        )

        switch (session.status) {
            case 'SUCCESSFUL':
                throw new Error('Credential has already been issued.')

            case 'UNSUCCESSFUL':
                throw new Error('Credential issuance has failed.')

            case 'EXPIRED':
                throw new Error('Offer URL has expired.')

            case 'ACTIVE':
                return

            default:
                throw new Error('Unknown issuance session status.')
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** validateCredentialOffer end ***')
    }
}
