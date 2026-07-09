 const authTypes = {
  // ウォレット管理 API 認証
  walletManagement: 'walletManagement',

  // 組織ウォレット管理 API 認証
  organizationWalletManagement: 'organizationWalletManagement',

  // DID 管理 API 認証
  didManagement: 'didManagement',

  // VC 証明書参照 API 認証
  vcCredentialReference: 'vcCredentialReference',

  // VC 証明書追加・更新 API 認証
  vcCredentialMutation: 'vcCredentialMutation',

  // VC 証明書削除 API 認証
  vcCredentialDelete: 'vcCredentialDelete',

  // OID4VCI API 認証
  oid4vci: 'oid4vci',

  // OID4VP API 認証
  oid4vp: 'oid4vp',

  // VC 検証 API 認証
  vcVerification: 'vcVerification',

  // Basic Info 管理 API 認証
  basicInfoManagement: 'basicInfoManagement',
}


export const authorizeApiAccess = (authType, authContext) => {
  switch (authType) {
    case authTypes.walletManagement:
      return authorizeWalletManagementApi(authContext)

    case authTypes.organizationWalletManagement:
      return authorizeOrganizationWalletManagementApi(authContext)

    case authTypes.didManagement:
      return authorizeDidManagementApi(authContext)

    case authTypes.vcCredentialReference:
      return authorizeVcCredentialReferenceApi(authContext)

    case authTypes.vcCredentialMutation:
      return authorizeVcCredentialMutationApi(authContext)

    case authTypes.vcCredentialDelete:
      return authorizeVcCredentialDeleteApi(authContext)

    case authTypes.oid4vci:
      return authorizeOid4vciApi(authContext)

    case authTypes.oid4vp:
      return authorizeOid4vpApi(authContext)

    case authTypes.vcVerification:
      return authorizeVcVerificationApi(authContext)

    case authTypes.basicInfoManagement:
      return authorizeBasicInfoManagementApi(authContext)

    default: {
      const error = new Error('未対応の認証種別です')
      error.code = 'InvalidRequestError'
      error.params = [
        {
          key: 'authType',
          value: authType,
        },
      ]
      throw error
    }
  }
}
