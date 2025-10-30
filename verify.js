// —— types ——
// 算法枚举：签名意图层面只需要 ES256 与 EdDSA
export type Alg = 'ES256' | 'EdDSA';
export type KeyType = 'ecdsa' | 'eddsa';

export type JWK = JsonWebKey;

export type IssuerEntryRaw = {
  issuer_did: string;
  verificationMethodId?: string;
  issuerKey?: { type: 'jwk'; jwk: JWK };
  keyType?: KeyType | 'secp256r1';
  publicKeyMultibase?: string;
  secretKeyMultibase?: string;
  [k: string]: any;
};

export type IssuerCryptoJwk = {
  mode: 'jwk';
  keyType: KeyType;
  alg: Alg;
  verificationMethodId: string;
  publicJwk: JWK;
  privateJwk: JWK;
};

export type IssuerCryptoMultibase = {
  mode: 'multibase';
  keyType: KeyType;               // 'ecdsa' 或 'eddsa'
  publicKeyMultibase: string;
  secretKeyMultibase: string;
};

export type IssuerCrypto = IssuerCryptoJwk | IssuerCryptoMultibase;

// —— type guards ——
function isJwkEntry(e: IssuerEntryRaw): e is IssuerEntryRaw & { issuerKey: { type: 'jwk'; jwk: JWK } } {
  return !!e.issuerKey && e.issuerKey.type === 'jwk' && !!e.issuerKey.jwk;
}
function isMultibaseEntry(e: IssuerEntryRaw): e is IssuerEntryRaw & { publicKeyMultibase: string; secretKeyMultibase: string } {
  return typeof e.publicKeyMultibase === 'string' && typeof e.secretKeyMultibase === 'string';
}
function isJwkCrypto(c: IssuerCrypto): c is IssuerCryptoJwk {
  return c.mode === 'jwk';
}



// base64url ⇄ Uint8Array
function base64urlToUint8Array(s: string): Uint8Array {
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = Buffer.from(b64, 'base64');
  return new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
}
function uint8ToBase64url(u8: Uint8Array): string {
  const b64 = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// 确保得到真正的 ArrayBuffer（规避 SharedArrayBuffer 报错）
function toBufferSource(u8: Uint8Array): ArrayBuffer {
  // 创建新的 ArrayBuffer 并拷贝，确保类型就是 ArrayBuffer
  const out = new ArrayBuffer(u8.byteLength);
  new Uint8Array(out).set(u8);
  return out;
}



import { webcrypto as crypto } from 'node:crypto';
// 你的 config 需要按你现有路径导入
import config from '../config';

function deriveKeyInfoFromConfigOrJwk(e: IssuerEntryRaw, jwk?: JWK): { keyType: KeyType; alg: Alg } {
  // 1) 优先用显式 keyType
  if (e.keyType === 'secp256r1' || e.keyType === 'ecdsa') return { keyType: 'ecdsa', alg: 'ES256' };
  if (e.keyType === 'eddsa') return { keyType: 'eddsa', alg: 'EdDSA' };

  // 2) 其次根据 JWK.kty/crv 判断
  if (jwk?.kty === 'EC' && (jwk as any).crv === 'P-256') return { keyType: 'ecdsa', alg: 'ES256' };
  if (jwk?.kty === 'OKP' && (jwk as any).crv === 'Ed25519') return { keyType: 'eddsa', alg: 'EdDSA' };

  // 3) 再不行，保守默认 ES256
  return { keyType: 'ecdsa', alg: 'ES256' };
}

export function loadKeyPairByIssuerDid(issuerDid: string): IssuerCrypto {
  const entry: IssuerEntryRaw | undefined = config.issuers.find((i: IssuerEntryRaw) => i.issuer_did === issuerDid);
  if (!entry) {
    const err: any = new Error(`Unknown issuerDid: ${issuerDid}`);
    err.status = 404;
    throw err;
  }

  if (isJwkEntry(entry)) {
    const jwk = entry.issuerKey!.jwk;
    if (!jwk) {
      const err: any = new Error(`Invalid JWK for ${issuerDid}: missing jwk`);
      err.status = 400;
      throw err;
    }
    const { keyType, alg } = deriveKeyInfoFromConfigOrJwk(entry, jwk);
    const verificationMethodId = entry.verificationMethodId ?? `${entry.issuer_did}#key-1`;
    // 这里直接把同一对 JWK 作为 public/private（如果你有分离的公私钥，按需替换）
    return {
      mode: 'jwk',
      keyType,
      alg,
      verificationMethodId,
      publicJwk: jwk,
      privateJwk: jwk,
    };
  }

  if (isMultibaseEntry(entry)) {
    const keyType = entry.keyType === 'eddsa' ? 'eddsa' : 'ecdsa';
    return {
      mode: 'multibase',
      keyType,
      publicKeyMultibase: entry.publicKeyMultibase!,
      secretKeyMultibase: entry.secretKeyMultibase!,
    };
  }

  const err: any = new Error(`Issuer config incomplete for ${issuerDid}`);
  err.status = 400;
  throw err;
}




async function jwkImportPublic(jwk: JWK, alg: Alg): Promise<CryptoKey> {
  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
  }
  if (alg === 'EdDSA') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  }
  throw new Error(`Unsupported alg: ${alg}`);
}

async function jwkImportPrivate(jwk: JWK, alg: Alg): Promise<CryptoKey> {
  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
  }
  if (alg === 'EdDSA') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'Ed25519' },
      false,
      ['sign'],
    );
  }
  throw new Error(`Unsupported alg: ${alg}`);
}




async function jwkImportPublic(jwk: JWK, alg: Alg): Promise<CryptoKey> {
  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
  }
  if (alg === 'EdDSA') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  }
  throw new Error(`Unsupported alg: ${alg}`);
}

async function jwkImportPrivate(jwk: JWK, alg: Alg): Promise<CryptoKey> {
  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
  }
  if (alg === 'EdDSA') {
    return crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      { name: 'Ed25519' },
      false,
      ['sign'],
    );
  }
  throw new Error(`Unsupported alg: ${alg}`);
}


export async function addProof(
  vc: any,
  issuerDid: string,
  controllerDid: string,
): Promise<any> {
  const issuerCrypto = loadKeyPairByIssuerDid(issuerDid);

  const proofType =
    isJwkCrypto(issuerCrypto)
      ? (issuerCrypto.alg === 'ES256' ? 'ecdsa' : 'eddsa')
      : issuerCrypto.keyType;

  const verificationMethod =
    isJwkCrypto(issuerCrypto)
      ? issuerCrypto.verificationMethodId
      : `${issuerDid}#key-1`;

  const proof = {
    type: proofType,
    created: new Date().toISOString(),
    verificationMethod,
    proofPurpose: 'assertionMethod',
  };

  const vcWithoutProof = removeProof(vc);
  const dataToSign = toSignableUint8Array(vcWithoutProof);
  const proofValue = await sign(dataToSign, issuerCrypto);

  const proofWithSignature = { ...proof, proofValue };
  return { ...vcWithoutProof, proof: proofWithSignature };
}





