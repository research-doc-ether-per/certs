export type KeyMode = 'multibase' | 'jwk'

export interface IssuerCrypto {
  mode: KeyMode
  keyType?: 'eddsa' | 'ecdsa'
  alg?: 'ES256' | 'Ed25519'
  verificationMethodId?: string
  publicJwk?: JsonWebKey
  privateJwk?: JsonWebKey
  publicKeyMultibase?: string
  secretKeyMultibase?: string
}


async function sign(dataToSign: Uint8Array, issuerCrypto: IssuerCrypto): Promise<string> {
  if (issuerCrypto.mode === 'jwk') {
    const { privateJwk, alg } = issuerCrypto
    if (!privateJwk || !alg) throw new Error('Missing JWK or algorithm')
    const keyData = await crypto.subtle.importKey(
      'jwk',
      privateJwk,
      { name: alg === 'ES256' ? 'ECDSA' : 'Ed25519', namedCurve: privateJwk.crv },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign(
      alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' },
      keyData,
      dataToSign.buffer
    )
    return Buffer.from(new Uint8Array(signature)).toString('base64url')
  } else {
    const keyType = keyUtils.getKeyTypeFromSecretKeyMultibase(issuerCrypto.secretKeyMultibase!)
    const secretKey = multibaseDecode(issuerCrypto.secretKeyMultibase!).bytes
    let signature
    if (keyType === 'eddsa') signature = await ed25519.sign(dataToSign, secretKey.slice(2))
    else if (keyType === 'ecdsa') signature = secp256k1.sign(dataToSign, secretKey.slice(2))
    return multibaseEncode(signature as Uint8Array, MultibaseEncoding.BASE64URL_NO_PAD)
  }
}

async function verify(signature: string, message: Uint8Array, issuerCrypto: IssuerCrypto): Promise<boolean> {
  try {
    if (issuerCrypto.mode === 'jwk') {
      const { publicJwk, alg } = issuerCrypto
      if (!publicJwk || !alg) throw new Error('Missing JWK or algorithm')
      const keyData = await crypto.subtle.importKey(
        'jwk',
        publicJwk,
        { name: alg === 'ES256' ? 'ECDSA' : 'Ed25519', namedCurve: publicJwk.crv },
        false,
        ['verify']
      )
      const sigBytes = Uint8Array.from(Buffer.from(signature, 'base64url'))
      return await crypto.subtle.verify(
        alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' },
        keyData,
        sigBytes.buffer,
        message.buffer
      )
    } else {
      const keyType = keyUtils.getKeyTypeFromPublicKeyMultibase(issuerCrypto.publicKeyMultibase!)
      const publicKey = multibaseDecode(issuerCrypto.publicKeyMultibase!).bytes
      const sigBytes = typeof signature === 'string' ? multibaseDecode(signature).bytes : signature
      if (keyType === 'eddsa') return ed25519.verify(sigBytes, message, publicKey.slice(2))
      if (keyType === 'ecdsa') return secp256k1.verify(sigBytes, message, publicKey.slice(2))
      throw new Error('unsupported key format')
    }
  } catch {
    return false
  }
}

function removeProof<T extends { proof?: unknown }>(vc: T): Omit<T, 'proof'> {
  const { proof, ...vcWithoutProof } = vc
  return vcWithoutProof
}

function toSignableUint8Array(obj: object): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj))
}

export async function addProof(vc: any, issuerDid: string, controllerDid: string): Promise<any> {
  const issuerCrypto = LoadKeyPairByIssuerDid(issuerDid)
  const proofType = issuerCrypto.alg || issuerCrypto.keyType
  const verificationMethod =
    issuerCrypto.mode === 'jwk'
      ? issuerCrypto.verificationMethodId
      : `${issuerDid}#key-1`
  const proof = {
    type: proofType,
    created: new Date().toISOString(),
    verificationMethod,
    proofPurpose: 'assertionMethod',
  }
  const vcWithoutProof = removeProof(vc)
  const dataToSign = toSignableUint8Array(vcWithoutProof)
  const proofValue = await sign(dataToSign, issuerCrypto)
  const proofWithSignature = { ...proof, proofValue }
  return { ...vcWithoutProof, proof: proofWithSignature }
}

export async function verifyBSL(vc: any, issuerDid: string): Promise<boolean> {
  const { proof, ...document } = vc
  if (!proof) throw new Error('Proof missing')
  const { proofValue } = proof
  const vcWithoutProof = removeProof(vc)
  const dataToVerify = new TextEncoder().encode(JSON.stringify(vcWithoutProof))
  const issuerCrypto = LoadKeyPairByIssuerDid(issuerDid)
  return await verify(proofValue, dataToVerify, issuerCrypto)
}
