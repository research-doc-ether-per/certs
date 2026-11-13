try {
    const result = parseCredential(rawCredential)
    console.log(result)
} catch (error) {
    console.error('Credential parse failed:', error.message)
}
