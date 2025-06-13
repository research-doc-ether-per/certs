// Project: did-web-server (Demo)
// Directory structure:
// did-web-server/
// ├── config/
// │   ├── did.json                   <-- Root DID Document (optional)
// │   ├── did.user-id-1234.json      <-- DID Document for user-id-1234
// │   └── did.user-id-5678.json      <-- DID Document for user-id-5678
// ├── certs/
// │   ├── key.pem                    <-- your private key
// │   └── server.crt                 <-- your self-signed cert
// ├── index.js                      <-- main server code
// └── package.json                  <-- dependencies & scripts

// package.json
{
  "name": "did-web-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}

// config/did.json (Root DID, optional)
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:web:host.docker.internal%3A3000",
  "verificationMethod": [],
  "authentication": []
}

// config/did.user-id-1234.json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1"
  ],
  "id": "did:web:host.docker.internal%3A3000:user-id-1234",
  "verificationMethod": [
    {
      "id": "did:web:host.docker.internal%3A3000:user-id-1234#key-1",
      "type": "EcdsaSecp256r1VerificationKey2019",
      "controller": "did:web:host.docker.internal%3A3000:user-id-1234",
      "publicKeyJwk": {
        "kty": "EC",
        "crv": "P-256",
        "x": "<BASE64URL_X_COORDINATE>",
        "y": "<BASE64URL_Y_COORDINATE>"
      }
    }
  ],
  "authentication": [
    "did:web:host.docker.internal%3A3000:user-id-1234#key-1"
  ],
  "assertionMethod": [
    "did:web:host.docker.internal%3A3000:user-id-1234#key-1"
  ]
}

// config/did.user-id-5678.json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1"
  ],
  "id": "did:web:host.docker.internal%3A3000:user-id-5678",
  "verificationMethod": [
    {
      "id": "did:web:host.docker.internal%3A3000:user-id-5678#key-1",
      "type": "EcdsaSecp256r1VerificationKey2019",
      "controller": "did:web:host.docker.internal%3A3000:user-id-5678",
      "publicKeyJwk": {
        "kty": "EC",
        "crv": "P-256",
        "x": "<BASE64URL_X_COORDINATE>",
        "y": "<BASE64URL_Y_COORDINATE>"
      }
    }
  ],
  "authentication": [
    "did:web:host.docker.internal%3A3000:user-id-5678#key-1"
  ],
  "assertionMethod": [
    "did:web:host.docker.internal%3A3000:user-id-5678#key-1"
  ]
}

// index.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';

const app = express();
const PORT = 3000;

// Serve root DID (optional)
app.get('/.well-known/did.json', (req, res) => {
  const rootPath = path.join(process.cwd(), 'config', 'did.json');
  if (fs.existsSync(rootPath)) {
    const rootDoc = JSON.parse(fs.readFileSync(rootPath, 'utf-8'));
    return res.json(rootDoc);
  }
  res.status(404).send('Not Found');
});

// Dynamic path-based DID serving
app.get('/:userId/did.json', (req, res) => {
  const userId = req.params.userId;
  const docPath = path.join(process.cwd(), 'config', `did.${userId}.json`);
  if (!fs.existsSync(docPath)) {
    return res.status(404).send('Not Found');
  }
  const doc = JSON.parse(fs.readFileSync(docPath, 'utf-8'));
  res.json(doc);
});

// Start HTTPS server
const key = fs.readFileSync(path.join(process.cwd(), 'certs', 'key.pem'));
const cert = fs.readFileSync(path.join(process.cwd(), 'certs', 'server.crt'));

https.createServer({ key, cert }, app)
  .listen(PORT, () => console.log(`HTTPS did:web demo server listening on https://host.docker.internal:${PORT}`));

