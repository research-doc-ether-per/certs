const {
  exists: statusListExists,
  statusListUrl,
} = await prepareStatusListUrl({
  walletDBService,
  groupId,
  type,
  createBSL,
})
