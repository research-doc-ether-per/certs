
export const getKeycloakConfigByPathname = (pathname) => {
  if (pathname.startsWith('/individual')) {
    return {
      type: 'personal',
      role: 'user',
      url: process.env.NEXT_PUBLIC_KEYCLOAK_REALM_PERSONAL_URL,
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM_PERSONAL_NAME,
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_REALM_PERSONAL_CLIENT_ID,
    }
  }

  if (pathname.startsWith('/vc_client')) {
    return {
      type: 'group',
      role: 'manager',
      url: process.env.NEXT_PUBLIC_KEYCLOAK_REALM_GROUP_URL,
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM_GROUP_NAME,
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_REALM_GROUP_CLIENT_ID,
    }
  }

  return null
}
