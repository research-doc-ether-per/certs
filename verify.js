
// src/paths.js

export const routeBases = {
  individual: '/individual',
  vcClient: '/vc_client',
}

export const routeTypes = {
  individual: 'individual',
  vcClient: 'vc_client',
}

/**
 * 現在の pathname からルート種別を取得
 */
export const getRouteTypeByPathname = (pathname = '') => {
  if (pathname.startsWith(routeBases.individual)) {
    return routeTypes.individual
  }

  if (pathname.startsWith(routeBases.vcClient)) {
    return routeTypes.vcClient
  }

  return null
}

/**
 * 現在の pathname から basePath を取得
 */
export const getBasePathByPathname = (pathname = '') => {
  const routeType = getRouteTypeByPathname(pathname)

  if (routeType === routeTypes.individual) {
    return routeBases.individual
  }

  if (routeType === routeTypes.vcClient) {
    return routeBases.vcClient
  }

  return ''
}

/**
 * basePath 付きの画面パスを生成
 */
export const createPaths = (basePath = '') => ({
  home: basePath || '/',
  credentialOfferUrlList: `${basePath}/credential-offer-url-list`,
  issueCredentialSettings: `${basePath}/issue/credential-settings`,
  issueCredentialConfirmation: `${basePath}/issue/confirmed`,
  notFound: `${basePath}/not-found`,
  credentialStatusList: `${basePath}/credential-status-list`,
})

/**
 * 現在の pathname に対応する画面パスを取得
 */
export const getPathsByPathname = (pathname = '') => {
  return createPaths(getBasePathByPathname(pathname))
}

/**
 * 旧コードとの互換用
 */
export const paths = createPaths()
