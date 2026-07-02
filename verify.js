// ルートアクセス時は個人 Wallet 入口へリダイレクト
    if (pathname === '/') {
      const queryString = searchParams.toString()

      router.replace(
        queryString
          ? `${routeBases.individual}?${queryString}`
          : routeBases.individual
      )

      return
    }
