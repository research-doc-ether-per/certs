import canonicalize from 'json-canonicalize';
import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';

export interface IssuerCrypto {
  mode: 'jwk' | 'multibase';
  keyType: 'eddsa' | 'ecdsa';
  alg?: 'ES256' | 'Ed25519';
  publicJwk?: JsonWebKey;
  privateJwk?: JsonWebKey;
  publicKeyMultibase?: string;
  secretKeyMultibase?: string;
}

//
// ---------- 工具函数 ----------
//
function toBufferSource(u8: Uint8Array | ArrayBufferLike): ArrayBuffer {
  return u8 instanceof Uint8Array ? u8.buffer.slice(0) : (u8 as ArrayBuffer);
}

function toSignableUint8Array(obj: object): Uint8Array {
  const canonicalized = canonicalize(obj);
  return new TextEncoder().encode(canonicalized);
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 ? 4 - (base64.length % 4) : 0;
  const padded = base64 + '='.repeat(pad);
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

//
// ---------- JWK 部分独立 ----------
//
async function verifyWithJwk(
  signature: string,
  message: Uint8Array,
  publicJwk: JsonWebKey,
  alg: 'ES256' | 'Ed25519'
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    {
      name: alg === 'ES256' ? 'ECDSA' : 'Ed25519',
      namedCurve: publicJwk.crv as string,
    },
    false,
    ['verify']
  );

  const sigBytes = base64UrlDecode(signature);
  const messageBytes = toBufferSource(message);

  return await crypto.subtle.verify(
    alg === 'ES256'
      ? { name: 'ECDSA', hash: 'SHA-256' }
      : { name: 'Ed25519' },
    key,
    sigBytes,
    messageBytes
  );
}

//
// ---------- multibaseDecode（与图1一致） ----------
//
export enum MultibaseEncoding {
  BASE64URL_NO_PAD = 'u',
  BASE58_BTC = 'z',
}

export function multibaseDecode(str: string): { bytes: Uint8Array; encoding: MultibaseEncoding } {
  if (!str || str.length < 2) {
    throw new Error('Invalid multibase string: too short');
  }
  const prefix = str[0] as MultibaseEncoding;
  const encoded = str.slice(1);

  let bytes: Uint8Array;
  switch (prefix) {
    case MultibaseEncoding.BASE64URL_NO_PAD:
      bytes = base64UrlDecode(encoded);
      break;
    case MultibaseEncoding.BASE58_BTC:
      bytes = secp256k1.utils.hexToBytes(secp256k1.utils.bytesToHex(Buffer.from(encoded, 'utf8')));
      break;
    default:
      const error = new Error(`Unsupported multibase encoding prefix: ${prefix}`);
      (error as any).status = 400;
      throw error;
  }
  return { bytes, encoding: prefix };
}

//
// ---------- verify（调用上面的 verifyWithJwk） ----------
//
export async function verify(
  signature: string,
  message: Uint8Array,
  issuerCrypto: IssuerCrypto
): Promise<boolean> {
  try {
    // ✅ JWK 模式
    if (issuerCrypto.mode === 'jwk') {
      const { publicJwk, alg } = issuerCrypto;
      if (!publicJwk || !alg) throw new Error('Missing JWK or algorithm');
      return await verifyWithJwk(signature, message, publicJwk, alg);
    }

    // ✅ Multibase 模式
    const { keyType, publicKeyMultibase } = issuerCrypto;
    if (!publicKeyMultibase) throw new Error('Missing publicKeyMultibase');
    const { bytes: publicKey } = multibaseDecode(publicKeyMultibase);
    const sigBytes = base64UrlDecode(signature);

    if (keyType === 'eddsa') {
      return await ed25519.verify(sigBytes, message, publicKey.slice(2));
    } else {
      return secp256k1.verify(sigBytes, message, publicKey.slice(2));
    }
  } catch (err) {
    console.error('Verification failed:', err);
    return false;
  }
}

//
// ---------- addProof / verifyBSL（完整整合版） ----------
//
export async function addProof(vc: any, issuerCrypto: IssuerCrypto): Promise<any> {
  const { keyType } = issuerCrypto;
  const proof: any = {
    type: keyType,
    created: new Date().toISOString(),
    proofPurpose: 'assertionMethod',
  };
  const vcWithoutProof = { ...vc };
  delete vcWithoutProof.proof;
  const dataToSign = toSignableUint8Array(vcWithoutProof);

  // 调用签名（省略 sign 函数，保持与 verify 一致）
  // ...
  return { ...vcWithoutProof, proof: { ...proof, proofValue: 'TODO: sign() result' } };
}

export async function verifyBSL(vc: any, issuerCrypto: IssuerCrypto): Promise<boolean> {
  const { proof, ...document } = vc;
  if (!proof) throw new Error('Proof missing');
  const dataToVerify = toSignableUint8Array(document);
  return await verify(proof.proofValue, dataToVerify, issuerCrypto);
}
