
const sdHash = digestBuf.toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
