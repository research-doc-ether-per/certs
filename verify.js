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




// 你已有
import canonicalize from 'json-canonicalize';

// 保留你原来的 removeProof / toSignableUint8Array
function removeProof<T extends { proof?: unknown }>(vc: T): Omit<T, 'proof'> {
  const { proof, ...rest } = vc as any;
  return rest;
}
function toSignableUint8Array(obj: object): Uint8Array {
  const canonicalized = canonicalize(obj);
  return new TextEncoder().encode(canonicalized);
}

// —— Multibase 辅助（你已有 multibaseDecode/Encode 的话继续用原来的）——
type MultibaseEncoding = 'u' | 'z';
function multibaseDecode(str: string): { bytes: Uint8Array; encoding: MultibaseEncoding } {
  if (!str || str.length < 2) {
    const err: any = new Error('Invalid multibase string: too short');
    err.status = 400;
    throw err;
  }
  const prefix = str[0] as MultibaseEncoding;
  const encoded = str.slice(1);
  let bytes: Uint8Array;
  switch (prefix) {
    case 'u': // base64url(no pad)
      bytes = base64urlToUint8Array(encoded);
      break;
    case 'z': // base58btc
      // 如果你有现成 base58 解码，替换这里；暂留为抛错占位
      throw new Error('BASE58 decoding not implemented here');
    default: {
      const err: any = new Error(`Unsupported multibase encoding prefix: ${prefix}`);
      err.status = 400;
      throw err;
    }
  }
  return { bytes, encoding: prefix };
}

// —— JWK 路径 ——
// 返回 base64url 字符串（和你之前一样）
async function sign(dataToSign: Uint8Array, issuerCrypto: IssuerCrypto): Promise<string> {
  if (isJwkCrypto(issuerCrypto)) {
    const { privateJwk, alg } = issuerCrypto;
    const key = await jwkImportPrivate(privateJwk, alg);
    const algo: any = alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' };
    const sig = await crypto.subtle.sign(algo, key, toBufferSource(dataToSign));
    return uint8ToBase64url(new Uint8Array(sig));
  }

  // multibase 保留你现有实现（示例：ed25519 / secp256k1）
  const keyType = issuerCrypto.keyType;
  const secretKey = multibaseDecode(issuerCrypto.secretKeyMultibase).bytes;
  if (keyType === 'eddsa') {
    const sig = await ed25519.sign(dataToSign, secretKey.slice(2)); // 你原来的库调用
    return uint8ToBase64url(sig as Uint8Array);
  }
  if (keyType === 'ecdsa') {
    const sig = await secp256k1.sign(dataToSign, secretKey.slice(2));
    return uint8ToBase64url(sig as Uint8Array);
  }
  throw new Error('unsupported key format');
}

async function verify(signature: string, message: Uint8Array, issuerCrypto: IssuerCrypto): Promise<boolean> {
  try {
    if (isJwkCrypto(issuerCrypto)) {
      const { publicJwk, alg } = issuerCrypto;
      if (!publicJwk) throw new Error('Missing JWK or algorithm');
      const key = await jwkImportPublic(publicJwk, alg);
      const algo: any = alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'Ed25519' };
      const sigBytes = base64urlToUint8Array(signature);
      return await crypto.subtle.verify(algo, key, toBufferSource(sigBytes), toBufferSource(message));
    }

    // multibase：走你原先的分支
    const keyType = issuerCrypto.keyType;
    const publicKey = multibaseDecode(issuerCrypto.publicKeyMultibase).bytes;
    const sigBytes = base64urlToUint8Array(signature);
    if (keyType === 'eddsa') return ed25519.verify(sigBytes, message, publicKey.slice(2));
    if (keyType === 'ecdsa') return secp256k1.verify(sigBytes, message, publicKey.slice(2));
    throw new Error('unsupported key format');
  } catch (e) {
    console.error('Error verifying signature:', e);
    return false;
  }
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


export async function verifyBSL(vc: any, issuerDid: string): Promise<boolean> {
  const { proof, ...document } = vc ?? {};
  if (!proof) {
    const err: any = new Error('Proof is missing');
    err.status = 400;
    throw err;
  }

  const proofValue: unknown = (proof as any).proofValue;
  if (typeof proofValue !== 'string' || proofValue.length === 0) {
    const err: any = new Error('Invalid proofValue');
    err.status = 400;
    throw err;
  }

  const vcWithoutProof = removeProof(vc);
  const dataToVerify = toSignableUint8Array(vcWithoutProof);

  const issuerCrypto = loadKeyPairByIssuerDid(issuerDid);
  return await verify(proofValue, dataToVerify, issuerCrypto);
}



