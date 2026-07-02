// src/app/providers.jsx

'use client'

import React, { Suspense } from 'react'
import { Box } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter'

import { LocalizationProvider } from '@/components/core/localization-provider'
import { ThemeProvider } from '@/components/core/theme-provider/theme-provider'

export default function Providers({ children }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <Box sx={{ minWidth: '400px' }}>
        <LocalizationProvider>
          <ThemeProvider>
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </ThemeProvider>
        </LocalizationProvider>
      </Box>
    </AppRouterCacheProvider>
  )
}


// src/app/layout.jsx

import React from 'react'
import Providers from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}



// src/app/(auth)/layout.jsx

'use client'

import React, { Suspense } from 'react'

import { UserProvider } from '@/context/user-context'
import AuthGuard from '@/components/auth-guard'
import HeaderNav from '@/components/header/header-nav'

export default function AuthLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <UserProvider>
        <AuthGuard>
          <HeaderNav />
          {children}
        </AuthGuard>
      </UserProvider>
    </Suspense>
  )
}
