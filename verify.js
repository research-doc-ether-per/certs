const postgresService = require('./postgres-client-service')

let logger

const setLogger = (log) => {
    logger = log
    postgresService.setLogger(log)
}

// Account ID で検索
const getAccountById = async (accountId) => {
    logger.debug('*** getAccountById start ***')

    try {
        const sql = `
            SELECT
                account_id,
                name,
                email,
                password_hash,
                created_on
            FROM ${postgresService.qt}.accounts
            WHERE account_id = $1
        `

        const response = await postgresService.executeQuery(sql, [accountId])
        const result = response[0] ?? null

        logger.debug('result : ', {
            found: result !== null,
        })

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getAccountById end ***')
    }
}

// Email で検索
const getAccountByEmail = async (email) => {
    logger.debug('*** getAccountByEmail start ***')

    try {
        const sql = `
            SELECT
                account_id,
                name,
                email,
                password_hash,
                created_on
            FROM ${postgresService.qt}.accounts
            WHERE email = $1
        `

        const response = await postgresService.executeQuery(sql, [email])
        const result = response[0] ?? null

        logger.debug('result : ', {
            found: result !== null,
        })

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getAccountByEmail end ***')
    }
}

// OIDC ID で検索
const getAccountByOidcId = async (oidcId) => {
    logger.debug('*** getAccountByOidcId start ***')

    try {
        const sql = `
            SELECT
                a.account_id,
                a.name,
                a.email,
                a.password_hash,
                a.created_on
            FROM ${postgresService.qt}.account_oidc_logins o
            INNER JOIN ${postgresService.qt}.accounts a
                ON a.account_id = o.account_id
            WHERE o.oidc_id = $1
        `

        const response = await postgresService.executeQuery(sql, [oidcId])
        const result = response[0] ?? null

        logger.debug('result : ', {
            found: result !== null,
        })

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getAccountByOidcId end ***')
    }
}

// Official DB: Account に関連する Wallet の取得
const getWalletList = async (accountId) => {
    logger.debug('*** getWalletList start ***')

    try {
        const sql = `
            SELECT
                aw.wallet_id,
                w.default_did_id,
                w.default_key_id
            FROM public.wallet2_account_wallets aw
            INNER JOIN public.wallet2_wallets w
                ON w.id = aw.wallet_id
            WHERE aw.account_id = $1
        `

        const response = await postgresService.executeQuery(sql, [accountId])

        logger.debug('result : ', {
            walletCount: response.length,
        })

        return response
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getWalletList end ***')
    }
}

// Custom DB: Account と Wallet の関連情報
const getAccountWallets = async (accountId) => {
    logger.debug('*** getAccountWallets start ***')

    try {
        const sql = `
            SELECT
                wallet_id,
                wallet_name,
                added_on
            FROM ${postgresService.qt}.account_wallets
            WHERE account_id = $1
        `

        const response = await postgresService.executeQuery(sql, [accountId])

        logger.debug('result : ', {
            walletCount: response.length,
        })

        return response
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getAccountWallets end ***')
    }
}

// Official DB: Wallet に関連する DID の取得
const getWalletDids = async (walletIds) => {
    logger.debug('*** getWalletDids start ***')

    try {
        if (!walletIds || walletIds.length === 0) {
            return []
        }

        const sql = `
            SELECT
                wds.wallet_id,
                d.did,
                d.document
            FROM public.wallet2_wallet_did_stores wds
            INNER JOIN public.wallet2_dids d
                ON d.store_id = wds.store_id
            WHERE wds.wallet_id = ANY($1::text[])
        `

        const response = await postgresService.executeQuery(sql, [walletIds])

        logger.debug('result : ', {
            didCount: response.length,
        })

        return response
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getWalletDids end ***')
    }
}

// Official DB: Wallet に関連する Key の取得
const getWalletKeys = async (walletIds) => {
    logger.debug('*** getWalletKeys start ***')

    try {
        if (!walletIds || walletIds.length === 0) {
            return []
        }

        const sql = `
            SELECT
                wks.wallet_id,
                k.key_id,
                k.serialized_key
            FROM public.wallet2_wallet_key_stores wks
            INNER JOIN public.wallet2_keys k
                ON k.store_id = wks.store_id
            WHERE wks.wallet_id = ANY($1::text[])
        `

        const response = await postgresService.executeQuery(sql, [walletIds])

        logger.debug('result : ', {
            keyCount: response.length,
        })

        return response
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getWalletKeys end ***')
    }
}

// Custom DB: DID Alias の取得
const getDidAliases = async (walletIds) => {
    logger.debug('*** getDidAliases start ***')

    try {
        if (!walletIds || walletIds.length === 0) {
            return []
        }

        const sql = `
            SELECT
                wallet_id,
                did,
                alias
            FROM ${postgresService.qt}.did_aliases
            WHERE wallet_id = ANY($1::text[])
        `

        const response = await postgresService.executeQuery(sql, [walletIds])

        logger.debug('result : ', {
            aliasCount: response.length,
        })

        return response
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getDidAliases end ***')
    }
}

// DID Document から Key ID を取得
const resolveDidKeyId = (didRow, keyRows, defaultDid, defaultKeyId) => {
    if (didRow.did === defaultDid && defaultKeyId) {
        return defaultKeyId
    }

    if (!didRow.document) {
        return null
    }

    try {
        const document =
            typeof didRow.document === 'string'
                ? JSON.parse(didRow.document)
                : didRow.document

        const verificationMethods = document.verificationMethod || []

        for (const method of verificationMethods) {
            const methodId = method.id || ''

            for (const key of keyRows) {
                if (
                    methodId === key.key_id ||
                    methodId.endsWith(`#${key.key_id}`) ||
                    methodId.includes(key.key_id)
                ) {
                    return key.key_id
                }
            }
        }

        return null
    } catch (error) {
        logger.warn(
            `Failed to resolve keyId from DID document: did=${didRow.did}, error=${error.message}`
        )

        return null
    }
}

// Account に関連する Wallet・DID・Key の取得
const getWalletsByAccountId = async (accountId) => {
    logger.debug('*** getWalletsByAccountId start ***')

    try {
        const wallets = await getWalletList(accountId)

        if (wallets.length === 0) {
            logger.debug('result : ', {
                walletCount: 0,
            })

            return []
        }

        const walletIds = wallets.map(
            (wallet) => wallet.wallet_id
        )

        const [
            accountWallets,
            dids,
            keys,
            aliases,
        ] = await Promise.all([
            getAccountWallets(accountId),
            getWalletDids(walletIds),
            getWalletKeys(walletIds),
            getDidAliases(walletIds),
        ])

        const accountWalletMap = new Map(
            accountWallets.map((row) => [
                row.wallet_id,
                row,
            ])
        )

        const aliasMap = new Map(
            aliases.map((row) => [
                `${row.wallet_id}:${row.did}`,
                row.alias,
            ])
        )

        const didMap = new Map()

        for (const row of dids) {
            if (!didMap.has(row.wallet_id)) {
                didMap.set(row.wallet_id, [])
            }

            didMap.get(row.wallet_id).push(row)
        }

        const keyMap = new Map()

        for (const row of keys) {
            if (!keyMap.has(row.wallet_id)) {
                keyMap.set(row.wallet_id, [])
            }

            keyMap.get(row.wallet_id).push(row)
        }

        const result = wallets.map((wallet) => {
            const accountWallet =
                accountWalletMap.get(wallet.wallet_id)

            const walletDids =
                didMap.get(wallet.wallet_id) || []

            const walletKeys =
                keyMap.get(wallet.wallet_id) || []

            const resolvedDids = walletDids.map((didRow) => {
                const alias =
                    aliasMap.get(
                        `${wallet.wallet_id}:${didRow.did}`
                    ) ?? null

                const keyId = resolveDidKeyId(
                    didRow,
                    walletKeys,
                    wallet.default_did_id,
                    wallet.default_key_id
                )

                return {
                    did: didRow.did,
                    alias,
                    keyId,
                }
            })

            return {
                walletId: wallet.wallet_id,
                walletName: accountWallet?.wallet_name ?? null,
                defaultDid: wallet.default_did_id ?? null,
                defaultKeyId: wallet.default_key_id ?? null,
                addedOn: accountWallet?.added_on ?? null,
                dids: resolvedDids,
            }
        })

        logger.debug('result : ', {
            walletCount: result.length,
        })

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getWalletsByAccountId end ***')
    }
}

module.exports = {
    setLogger,
    getAccountById,
    getAccountByEmail,
    getAccountByOidcId,
    getWalletsByAccountId,
}
