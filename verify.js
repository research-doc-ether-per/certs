export type JwkEc = {
  kty: string
  crv: string
  x: string
  y?: string
  d?: string
  kid?: string
}

export interface IssuerEntryRaw {
  issuer_did: string
  verificationMethodId?: string
  issuerKey?: { type: string; jwk: any }
  keyType?: string
  publicKeyMultibase?: string
  secretKeyMultibase?: string
  [k: string]: any
}

export type KeyType = 'ecdsa' | 'eddsa'
export type Alg = 'ES256' | 'ES256K' | 'EdDSA'

export type IssuerCryptoJwk = {
  mode: 'jwk'
  keyType: KeyType
  alg: Alg
  verificationMethodId: string
  publicJwk: JwkEc
  privateJwk: JwkEc
}

export type IssuerCryptoMultibase = {
  mode: 'multibase'
  publicKeyMultibase: string
  secretKeyMultibase: string
}

export type IssuerCrypto = IssuerCryptoJwk | IssuerCryptoMultibase

export interface AppConfig {
  issuers: IssuerEntryRaw[]
}



import { config } from '../config'
import {
  IssuerEntryRaw,
  IssuerCrypto,
  IssuerCryptoJwk,
  IssuerCryptoMultibase,
  KeyType,
  Alg,
  JwkEc,
} from './types'

function isJwkEntry(e: IssuerEntryRaw): boolean {
  return !!e.issuerKey && e.issuerKey.type === 'jwk' && !!e.issuerKey.jwk
}
function isMultibaseEntry(e: IssuerEntryRaw): boolean {
  return !!e.publicKeyMultibase && !!e.secretKeyMultibase
}

function deriveKeyInfoFromConfigOrJwk(
  entry: IssuerEntryRaw,
  jwk: JwkEc
): { keyType: KeyType; alg: Alg } {
  const byCfg = (entry.keyType || '').toLowerCase()
  const byCrv = (jwk.crv || '').toLowerCase()

  const mapCfg: Record<string, { keyType: KeyType; alg: Alg }> = {
    secp256r1: { keyType: 'ecdsa', alg: 'ES256' },
    p256: { keyType: 'ecdsa', alg: 'ES256' },
    secp256k1: { keyType: 'ecdsa', alg: 'ES256K' },
    ed25519: { keyType: 'eddsa', alg: 'EdDSA' },
  }
  const mapCrv: Record<string, { keyType: KeyType; alg: Alg }> = {
    'p-256': { keyType: 'ecdsa', alg: 'ES256' },
    secp256k1: { keyType: 'ecdsa', alg: 'ES256K' },
    ed25519: { keyType: 'eddsa', alg: 'EdDSA' },
  }

  const fromCfg = mapCfg[byCfg]
  const fromCrv = mapCrv[byCrv]

  if (fromCfg && fromCrv && (fromCfg.keyType !== fromCrv.keyType || fromCfg.alg !== fromCrv.alg)) {
    throw new Error(
      `keyType mismatch: config.keyType='${entry.keyType}' vs JWK.crv='${jwk.crv}'`
    )
  }
  const res = fromCfg ?? fromCrv
  if (!res) {
    throw new Error(
      `Cannot derive keyType/alg from keyType='${entry.keyType}' & crv='${jwk.crv}'`
    )
  }
  return res
}

export function LoadKeyPairByIssuerDid(issuerDid: string): IssuerCrypto {
  const entry: IssuerEntryRaw | undefined = config.issuers.find(
    (i: IssuerEntryRaw) => i.issuer_did === issuerDid
  )
  if (!entry) {
    throw new Error(`Unknown issuerDid: ${issuerDid}`)
  }

  if (isJwkEntry(entry)) {
    const jwk = entry.issuerKey!.jwk as JwkEc
    if (!jwk.kty || !jwk.crv || !jwk.x) {
      throw new Error(`Invalid JWK for ${issuerDid}: missing kty/crv/x`)
    }

    const { d, ...pubRest } = jwk
    const publicJwk: JwkEc = pubRest as JwkEc

    const { keyType, alg } = deriveKeyInfoFromConfigOrJwk(entry, jwk)
    const verificationMethodId =
      entry.verificationMethodId ?? `${entry.issuer_did}#${jwk.kid ?? 'key-1'}`

    const out: IssuerCryptoJwk = {
      mode: 'jwk',
      keyType,
      alg,
      verificationMethodId,
      publicJwk,
      privateJwk: jwk,
    }
    return out
  }

  if (isMultibaseEntry(entry)) {
    const out: IssuerCryptoMultibase = {
      mode: 'multibase',
      publicKeyMultibase: entry.publicKeyMultibase!,
      secretKeyMultibase: entry.secretKeyMultibase!,
    }
    return out
  }

  const err: any = new Error(`Issuer config incomplete for ${issuerDid}`)
  err.status = 404
  throw err
}




