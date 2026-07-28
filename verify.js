const verifyResult = {
  presentation,
  credentials,
}

await saveVpResult({
  realmName,
  groupId,
  requestBody: {
    state,
    vpToken,
    userName,
    verifyResult,
  },
})
