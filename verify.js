# 生成 P-256 私钥
openssl ecparam -name prime256v1 -genkey -noout -out ec-key.pem

# 从私钥导出公钥（PEM 格式）
openssl ec -in ec-key.pem -pubout -out ec-pub.pem

# 导出成 DER 格式
openssl ec -in ec-key.pem -pubout -outform DER -out ec-pub.der

// toJwk.js
import fs from 'fs';
import { Buffer } from 'buffer';
import { createPublicKey } from 'crypto';

// 读取 PEM 公钥
const pem = fs.readFileSync('ec-pub.pem', 'utf8');
// 用 Node.js crypto 解析
const keyObj = createPublicKey(pem);
const der = keyObj.export({ type: 'spki', format: 'der' });

// DER 结构: 0x30… Sequence → BIT STRING → 0x04… Octet String of ECPoint
// ECPoint 第一字节 0x04 后面紧跟 X||Y，各 32 字节
const ecPoint = der.slice(-65);        // 最后 65 字节
const x = ecPoint.slice(1, 33);        // 字节 1–32
const y = ecPoint.slice(33, 65);       // 字节 33–64

// Base64URL 编码
const b64url = buf =>
  buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

console.log('x:', b64url(x));
console.log('y:', b64url(y));
