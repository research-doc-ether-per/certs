// https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-12
const fs = require('fs')

const getSupportedIssuersFromFile = (path = '.env') => {
  if (!fs.existsSync(path)) return []

  const lines = fs.readFileSync(path, 'utf-8').split('\n')

  return lines
    .map(line => line.trim())
    .filter(line =>
      line &&
      !line.startsWith('#') &&
      line.startsWith('SUPPORTED_VERIFIABLE_ISSUER_')
    )
    .map(line => {
      const index = line.indexOf('=')
      if (index === -1) return null
      return line.slice(index + 1).trim()
    })
    .filter(Boolean)
}

const issuers = getSupportedIssuersFromFile()
