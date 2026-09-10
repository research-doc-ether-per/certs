const {
  walletApi2,
  handleGet,
  handlePost,
} = require('./fetch-service')

/**
 * Wallet2 Account 登録
 *
 * @param {string} email
 * @param {string} password
 */
const registerAccount = async (email, password) => {
  const response = await handlePost(
    walletApi2,
    '/auth/register',
    null,
    {
      email,
      password,
    }
  )

  return response.data
}

/**
 * Wallet2 Login
 *
 * @param {string} email
 * @param {string} password
 */
const login = async (email, password) => {
  const response = await handlePost(
    walletApi2,
    '/auth/emailpass',
    null,
    {
      email,
      password,
    }
  )

  return response.data
}

/**
 * Login Account 情報取得
 *
 * @param {string} accessToken
 */
const getAccount = async (accessToken) => {
  const response = await handleGet(
    walletApi2,
    '/auth/account',
    accessToken
  )

  return response.data
}

/**
 * Account が所有する Wallet 一覧取得
 *
 * @param {string} accessToken
 */
const getAccountWallets = async (accessToken) => {
  const response = await handleGet(
    walletApi2,
    '/auth/account/wallets',
    accessToken
  )

  return response.data
}

/**
 * Wallet 作成
 *
 * @param {string} accessToken
 * @param {object} params
 */
const createWallet = async (
  accessToken,
  params = {}
) => {
  const response = await handlePost(
    walletApi2,
    '/wallet',
    accessToken,
    params
  )

  return response.data
}

module.exports = {
  registerAccount,
  login,
  getAccount,
  getAccountWallets,
  createWallet,
}
