// types.ts（可放一起）
export type JwkEc = {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  d?: string;
  kid?: string;
};

export type IssuerCryptoJwk = {
  mode: 'jwk';
  keyType: 'ecdsa';
  alg: 'ES256';
  verificationMethodId: string;
  publicJwk: JwkEc;   // 没有 d
  privateJwk: JwkEc;  // 带 d
};

export type IssuerCryptoMultibase = {
  mode: 'multibase';
  publicKeyMultibase: string;
  secretKeyMultibase: string;
};

export type IssuerCrypto = IssuerCryptoJwk | IssuerCryptoMultibase;


// key-loader.ts
import { config } from './config'
import { IssuerCrypto, JwkEc } from './types'

type KeyInfo = { keyType: 'ecdsa' | 'eddsa'; alg: 'ES256' | 'ES256K' | 'EdDSA' }

function deriveKeyInfoFromConfigOrJwk(entry: any, jwk: JwkEc): KeyInfo {
  // 1) 映射表：配置值 -> keyType / alg
  const mapByConfig: Record<string, KeyInfo> = {
    secp256r1: { keyType: 'ecdsa', alg: 'ES256'  },
    P256:      { keyType: 'ecdsa', alg: 'ES256'  },
    secp256k1: { keyType: 'ecdsa', alg: 'ES256K' },
    Ed25519:   { keyType: 'eddsa', alg: 'EdDSA'  },
    ed25519:   { keyType: 'eddsa', alg: 'EdDSA'  },
  }

  // 2) 映射表：JWK.crv -> keyType / alg
  const mapByCrv: Record<string, KeyInfo> = {
    'P-256':   { keyType: 'ecdsa', alg: 'ES256'  },
    'secp256k1': { keyType: 'ecdsa', alg: 'ES256K' },
    'Ed25519': { keyType: 'eddsa', alg: 'EdDSA'  },
  }

  const byCfg = entry.keyType ? mapByConfig[String(entry.keyType)] : undefined
  const byCrv = jwk?.crv ? mapByCrv[String(jwk.crv)] : undefined

  if (byCfg && byCrv && (byCfg.keyType !== byCrv.keyType || byCfg.alg !== byCrv.alg)) {
    throw new Error(
      `keyType mismatch: config keyType='${entry.keyType}' conflicts with JWK crv='${jwk.crv}'`
    )
  }
  return byCfg ?? byCrv ?? (() => { throw new Error(`Cannot derive keyType/alg from config.keyType='${entry.keyType}' and JWK.crv='${jwk?.crv}'`) })()
}

export function LoadKeyPairByIssuerDid(issuerDid: string): IssuerCrypto {
  const entry = config.issuers.find((i: any) => i.issuer_did === issuerDid)
  if (!entry) throw new Error(`Unknown issuerDid: ${issuerDid}`)

  // === did:web (JWK) 分支 ===
  if (entry.issuerKey?.type === 'jwk' && entry.issuerKey?.jwk) {
    const jwk: JwkEc = entry.issuerKey.jwk
    const { d, ...pubRest } = jwk
    const publicJwk: JwkEc = pubRest as JwkEc

    const { keyType, alg } = deriveKeyInfoFromConfigOrJwk(entry, jwk)

    const verificationMethodId: string =
      entry.verificationMethodId ?? `${entry.issuer_did}#${jwk.kid ?? 'key-1'}`

    return {
      mode: 'jwk',
      keyType,        // ← 这里会是 'ecdsa'（来自 'secp256r1'）
      alg,            // ← 'ES256'
      verificationMethodId,
      publicJwk,
      privateJwk: jwk,
    }
  }

  // === 原有 multibase 分支（保持不变） ===
  if (entry.publicKeyMultibase && entry.secretKeyMultibase) {
    return {
      mode: 'multibase',
      publicKeyMultibase: entry.publicKeyMultibase,
      secretKeyMultibase: entry.secretKeyMultibase,
    }
  }

  throw new Error(`Issuer config incomplete for ${issuerDid}`)
}
