// 証明書画像を設定する。
if (Array.isArray(imagePath) && imagePath.length > 0) {
    const requestImage = getValueByPath(
        offerData.credentialData || {},
        imagePath
    )

    const profileImage = getValueByPath(
        profile.credentialData || {},
        imagePath
    )

    // 管理者が指定した画像を優先する。
    const targetImage =
        imageData ||
        requestImage ||
        profileImage ||
        images?.default ||
        null

    if (targetImage) {
        setValueByPath(
            credentialData,
            imagePath,
            targetImage
        )
    }
}
