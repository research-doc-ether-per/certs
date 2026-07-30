
 const ERROR_MESSAGES = {
  walletNotSelected:
   'ウォレットが選択されていません。ウォレット一覧画面でウォレットを選択してください。',
}

React.useEffect(() => {
  let timer

  if (!userId && roleTypes.corporate === userInfoRole) {
    setError({
      message: ERROR_MESSAGES.walletNotSelected,
    })

    timer = setTimeout(() => {
      const currentPath = getBasePathByPathname(pathname)
      router.replace(`${currentPath}${paths.wallets}`)
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }

  initialize()
}, [userId, userInfoRole, pathname, router])
