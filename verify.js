'use client'

import { createContext, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { keycloakInit } from '@/lib/keycloak'
import { getKeycloakConfigByPathname } from '@/lib/keycloak-config'
import logger from '@/lib/logger'

export const UserContext = createContext(null)

export function UserProvider({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [realm, setRealm] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [userInfoRole, setUserInfoRole] = useState(null)

  const isInitialized = useRef(false)

  useEffect(() => {
    initialize()
  }, [pathname])

  /**
   * ユーザー認証を初期化
   */
  const initialize = async () => {
    try {
      if (isInitialized.current) return

      if (typeof window === 'undefined') return

      const keycloakConfig = getKeycloakConfigByPathname(pathname)

      logger.debug('keycloakConfig:', keycloakConfig)

      if (!keycloakConfig) {
        setLoading(false)
        return
      }

      const kc = await keycloakInit(keycloakConfig)

      logger.debug('authenticated:', kc.authenticated)

      if (!kc.authenticated) {
        await kc.login({
          redirectUri: window.location.href,
        })
        return
      }

      logger.debug('accessToken:', kc?.token)

      const profile = await kc.loadUserInfo()

      logger.debug('userInfo:', profile)
      logger.debug('userId:', profile.sub)

      setRealm(keycloakConfig.realm)
      setUserInfo(profile)
      setUserInfoRole(keycloakConfig.role)
      setLoading(false)

      isInitialized.current = true
    } catch (error) {
      logger.error('user-context.jsx >>> initialize error:', error)
      setLoading(false)
      isInitialized.current = true
    }
  }

  return (
    <UserContext.Provider
      value={{
        loading,
        realm,
        userInfo,
        userInfoRole,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
