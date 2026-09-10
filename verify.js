const wallet2Service = require('../services/wallet2-service')

const main = async () => {
  const email = `wallet2-test-${Date.now()}@example.com`
  const password = 'Test123456!'

  console.log('===== Wallet2 Auth Sample Start =====')

  // Account 登録
  console.log('\n[1] Account 登録')

  const registerResult =
    await wallet2Service.registerAccount(
      email,
      password
    )

  console.log(registerResult)

  // Login
  console.log('\n[2] Login')

  const loginResult =
    await wallet2Service.login(
      email,
      password
    )

  console.log(loginResult)

  // 这里第一次先确认实际 Response
  const accessToken =
    loginResult.token ||
    loginResult.accessToken ||
    loginResult.access_token

  if (!accessToken) {
    throw new Error(
      'Login response に Access Token がありません。'
    )
  }

  // Account 情報
  console.log('\n[3] Account 情報取得')

  const account =
    await wallet2Service.getAccount(
      accessToken
    )

  console.log(account)

  // Wallet 作成
  console.log('\n[4] Wallet 作成')

  const wallet =
    await wallet2Service.createWallet(
      accessToken
    )

  console.log(wallet)

  // Wallet 一覧
  console.log('\n[5] Wallet 一覧取得')

  const wallets =
    await wallet2Service.getAccountWallets(
      accessToken
    )

  console.log(wallets)

  console.log('\n===== Wallet2 Auth Sample End =====')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
