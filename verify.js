
const issueModes = {
  // 個人ユーザーによる個人向け発行
  individualToIndividual: 'individualToIndividual',

  // 組織ユーザーによる組織向け発行
  organizationToOrganization: 'organizationToOrganization',

  // 管理者による個人向け発行
  adminToIndividual: 'adminToIndividual',

  // 管理者による組織向け発行
  adminToOrganization: 'adminToOrganization',
}


import { issueModes } from '@/constants/issueModes'

/**
 * パスから証明書発行モードを取得する
 *
 * @param {string} pathname パス
 * @returns {string|null} 証明書発行モード
 */
export const getIssueModeByPathname = (pathname) => {
  if (pathname.startsWith('/admin/organization')) {
    return issueModes.adminToOrganization
  }

  if (pathname.startsWith('/admin/individual')) {
    return issueModes.adminToIndividual
  }

  if (pathname.startsWith('/organization')) {
    return issueModes.organization
  }

  if (pathname.startsWith('/individual')) {
    return issueModes.individual
  }

  return null
}
