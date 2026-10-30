// Status Listが未登録の場合のみ登録する。
if (existsStatus === false) {
    if (!statusListUrl) {
        throw new Error('Status List URL is missing.')
    }

    await registerStatusList({
        client,
        groupId,
        type: credentialType,
        statusListUrl
    })
}
