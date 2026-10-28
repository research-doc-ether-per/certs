
case CREDENTIAL_FORMAT.SD_JWT_VC: {
    const suffix = `_${CREDENTIAL_FORMAT.SD_JWT_VC}`

    if (!credentialConfigurationId.endsWith(suffix)) {
        throw new Error('Invalid Credential Configuration ID.')
    }

    // Credential Configuration IDからタイプを取得する。
    const type = credentialConfigurationId.slice(
        0,
        -suffix.length
    )

    // VCTからタイプを取得する。
    const vct = configuration.vct

    if (typeof vct !== 'string' || !vct) {
        throw new Error('Credential VCT is missing.')
    }

    const vctType = vct.substring(vct.lastIndexOf('/') + 1)

    // Credentialタイプを比較する。
    if (!type || !vctType || type !== vctType) {
        throw new Error('Credential type does not match.')
    }

    break
}
