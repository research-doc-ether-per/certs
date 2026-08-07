import { getPermissionRolesFromToken } from '@/utils/permission-utils'

const roles = getPermissionRolesFromToken(keycloak.tokenParsed)

setUserInfo({
  ...userInfo,
  roles,
})


import { useMemo } from 'react'
import { useUser } from '@/context/user-context'
import { getCredentialPermissions } from '@/utils/permission-utils'

const { userInfo, selectedGroup } = useUser()

const permissions = useMemo(() => {
  return getCredentialPermissions({
    roles: userInfo?.roles || [],
    groupId: selectedGroup?.groupId,
  })
}, [userInfo?.roles, selectedGroup?.groupId])

const { canReference, canAcquire, canPresent, canDelete } = permissions
