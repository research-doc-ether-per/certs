// 有効期限を設定・削除する。
if (Array.isArray(expirationDatePath) && expirationDatePath.length > 0) {
    if (expirationDate != null && expirationDate !== '') {
        // 指定された有効期限を設定する。
        setValueByPath(
            credentialData,
            expirationDatePath,
            expirationDate
        )
    } else {
        // 有効期限が未指定の場合は削除する。
        deleteValueByPath(
            credentialData,
            expirationDatePath
        )
    }
}

// Profileの有効期限Mappingを削除する。
delete mapping.expirationDate
