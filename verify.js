import { LoadKeyPairByIssuerDid } from './key-loader'
import { multibaseDecode, multibaseEncode, MultibaseEncoding } from 'multibase'
import * as keyUtils from './keyUtils'
import * as secp256k1 from '@noble/secp256k1'
import * as ed25519 from '@noble/ed25519'

async function sign(dataToSign: Uint8Array | ArrayBufferLike, issuerCrypto: any): Promise<string> {
  if (issuerCrypto.mode === 'jwk') {
    const { privateJwk, alg } = issuerCrypto
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
      dataToSign
    )
    return Buffer.from(new Uint8Array(signature)).toString('base64url')
  } else {
    const keyType = keyUtils.getKeyTypeFromSecretKeyMultibase(issuerCrypto.secretKeyMultibase)
    const secretKey = multibaseDecode(issuerCrypto.secretKeyMultibase).bytes
    let signature
    if (keyType === 'eddsa') signature = ed25519.sign(dataToSign, secretKey.slice(2))
    else if (keyType === 'ecdsa') signature = secp256k1.sign(dataToSign, secretKey.slice(2))
    return multibaseEncode(signature as Uint8Array<ArrayBufferLike>, MultibaseEncoding.BASE64URL_NO_PAD)
  }
}

async function verify(signature: Uint8Array, message: Uint8Array, issuerCrypto: any): Promise<boolean> {
  try {
    if (issuerCrypto.mode === 'jwk') {
      const { publicJwk, alg } = issuerCrypto
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
        sigBytes,
        message
      )
    } else {
      const keyType = keyUtils.getKeyTypeFromPublicKeyMultibase(issuerCrypto.publicKeyMultibase)
      const publicKey = multibaseDecode(issuerCrypto.publicKeyMultibase).bytes
      if (keyType === 'eddsa') return ed25519.verify(signature, message, publicKey.slice(2))
      if (keyType === 'ecdsa') return secp256k1.verify(signature, message, publicKey.slice(2))
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
  const signature = Buffer.from(proofValue, 'base64url')
  const issuerCrypto = LoadKeyPairByIssuerDid(issuerDid)
  return await verify(signature, dataToVerify, issuerCrypto)
}
