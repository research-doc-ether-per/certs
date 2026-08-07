React.useEffect(() => {
  let timer

  if (!userId && roleTypes.corporate === userInfoRole) {
    setError({ message: ERROR_MESSAGES.walletNotSelected })

    timer = setTimeout(() => {
      const currentPath = getBasePathByPathname(pathname)
      router.replace(`${currentPath}${paths.wallets}`)
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }

  if (roleTypes.corporate === userInfoRole && !canReference) {
    setError({
      message: '選択中の組織ウォレットに対する証明書参照権限がありません。',
    })

    return undefined
  }

  initialize()

  return () => {
    if (timer) {
      clearTimeout(timer)
    }
  }
}, [userId, userInfoRole, canReference, pathname, router])
