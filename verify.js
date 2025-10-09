// routes/index.js
// --- ルーティング定義（デモ用：認証なし） ---

import { Router } from 'express';
import {
  createStatusList,
  allocateIndexForVc,
  revokeVc,
  restoreVc
} from '../controllers/statusListController.js';

const router = Router();

// StatusList 作成（管理API）
router.post('/lists', createStatusList);

// VC 用 index を割り当て（管理API）
router.post('/lists/:id/index', allocateIndexForVc);

// 撤回（bit=1）／復旧（bit=0） （管理API）
router.post('/lists/:id/revoke', revokeVc);
router.post('/lists/:id/restore', restoreVc);

export default router;

// controllers/statusListController.js
// --- /lists 系 API のコントローラ：入力検証 → services を呼び出し → レスポンス形成 ---
// デモ用：認証なし。必ずローカル環境でのみ使用してください。

import {
  store,
  getRevokedIndexes
} from '../services/store.js';
import { publishJsonAtomically } from '../services/publisher.js';
import {
  createZeroBitset, setBit, gzipBase64, buildStatusListCredentialJson
} from '../utils/bitstring.js';

// POST /lists
// 新しい StatusList を作成し、初期 encodedList=全0 の JSON を public/status/:id.json に公開
export async function createStatusList(req, res) {
  try {
    const { purpose = 'revocation', size = 1000 } = req.body || {};

    // 1) ストアに新規作成（url/objectKey は後で設定）
    const provisional = await store.createList({ purpose, size });

    // 2) 公開 URL とオブジェクトキーを決定
    const baseUrl = process.env.BASE_PUBLIC_URL?.replace(/\/$/, '') || '';
    if (!baseUrl) return res.status(500).json({ error: 'BASE_PUBLIC_URL not set' });

    const url = `${baseUrl}/${provisional.id}.json`;
    const objectKey = `status/${provisional.id}.json`;

    // 3) 全0ビット列 → GZIP+Base64 → SLC(JSON) 生成
    const bitset = createZeroBitset(size);
    const encodedList = gzipBase64(bitset);
    const json = buildStatusListCredentialJson({
      url,
      purpose,
      encodedList,
      issuerDid: process.env.ISSUER_DID
    });

    // 4) 公開ファイルへ原子的書き込み
    await publishJsonAtomically(objectKey, json);

    // 5) ストアへ url/objectKey を反映
    const finalList = await store.updateListUrlAndKey(provisional.id, { url, objectKey });

    return res.json({ ok: true, list: finalList, publicUrl: url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

// POST /lists/:id/index
// 指定 list に対して空き index を 1 つ割り当て、VC 側に埋め込む credentialStatus 片を返す
export async function allocateIndexForVc(req, res) {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    const list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const rec = await store.allocateIndex(listId, vcId);

    return res.json({
      credentialStatus: {
        id: `${list.url}#${rec.status_list_index}`,
        type: 'BitstringStatusListEntry',
        statusPurpose: list.purpose,
        statusListIndex: String(rec.status_list_index),
        statusListCredential: list.url
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

// POST /lists/:id/revoke
// 指定 VC のビットを 1 にし、encodedList を再生成して公開 JSON を上書き
export async function revokeVc(req, res) {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    const list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const rec = await store.getVcStatus(vcId);
    if (!rec || rec.list_id !== listId) return res.status(404).json({ error: 'vc not found in this list' });

    // 既存の無効 index 群を反映 → 対象 index を 1 に
    const revoked = await getRevokedIndexes(listId);
    const bitset = createZeroBitset(list.size);
    for (const idx of revoked) setBit(bitset, idx, 1);
    setBit(bitset, rec.status_list_index, 1);

    const encodedList = gzipBase64(bitset);
    const json = buildStatusListCredentialJson({
      url: list.url,
      purpose: list.purpose,
      encodedList,
      issuerDid: process.env.ISSUER_DID
    });
    await publishJsonAtomically(list.object_key, json);

    await store.markStatus(vcId, 1);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

// POST /lists/:id/restore
// 指定 VC のビットを 0 にし、encodedList を再生成して公開 JSON を上書き
export async function restoreVc(req, res) {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    const list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const rec = await store.getVcStatus(vcId);
    if (!rec || rec.list_id !== listId) return res.status(404).json({ error: 'vc not found in this list' });

    // 既存の無効 index 群を反映 → 当該 VC のビットのみ 0 に
    const revoked = await getRevokedIndexes(listId);
    const bitset = createZeroBitset(list.size);
    for (const idx of revoked) setBit(bitset, idx, 1);
    setBit(bitset, rec.status_list_index, 0);

    const encodedList = gzipBase64(bitset);
    const json = buildStatusListCredentialJson({
      url: list.url,
      purpose: list.purpose,
      encodedList,
      issuerDid: process.env.ISSUER_DID
    });
    await publishJsonAtomically(list.object_key, json);

    await store.markStatus(vcId, 0);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

// services/store.js
// --- JSON ファイルを使った簡易ストア（DB を使わない版） ---
// data/status_lists.json: { seq: <number>, items: [ {id, purpose, size, url, object_key, ...} ] }
// data/vc_status.json   : { items: [ {vc_id, list_id, status_list_index, purpose, status, updated_at} ] }

import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const listsFile = path.join(dataDir, 'status_lists.json');
const vcFile = path.join(dataDir, 'vc_status.json');

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(listsFile)) fs.writeFileSync(listsFile, JSON.stringify({ seq: 0, items: [] }, null, 2));
  if (!fs.existsSync(vcFile)) fs.writeFileSync(vcFile, JSON.stringify({ items: [] }, null, 2));
}
ensureFiles();

// JSON ファイル読み書き（シンプル同期版）
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }

export const store = {
  // StatusList を新規作成（url/objectKey は後で設定）
  async createList({ purpose, size, url, objectKey }) {
    const j = readJson(listsFile);
    const id = ++j.seq;
    const rec = { id, purpose, size, url: url || '', object_key: objectKey || '', version: 1, created_at: new Date().toISOString() };
    j.items.push(rec);
    writeJson(listsFile, j);
    return rec;
  },

  // 作成済みの list に url/objectKey を反映
  async updateListUrlAndKey(id, { url, objectKey }) {
    const j = readJson(listsFile);
    const idx = j.items.findIndex(x => x.id === Number(id));
    if (idx < 0) throw new Error('list not found');
    j.items[idx].url = url;
    j.items[idx].object_key = objectKey;
    writeJson(listsFile, j);
    return j.items[idx];
  },

  async getList(id) {
    const j = readJson(listsFile);
    return j.items.find(x => x.id === Number(id));
  },

  async listAll() {
    return readJson(listsFile).items;
  },

  // VC に空き index を割当て（簡易: 0..size-1 を線形探索）
  async allocateIndex(listId, vcId) {
    const list = await this.getList(listId);
    if (!list) throw new Error('list not found');
    const vj = readJson(vcFile);

    // その list で使用中 index を集合化
    const used = new Set(vj.items.filter(x => x.list_id === list.id).map(x => x.status_list_index));

    // 最小の空き index を探す
    let idx = 0;
    while (idx < list.size) {
      if (!used.has(idx)) break;
      idx++;
    }
    if (idx >= list.size) throw new Error('list is full');

    // vc_id が既に存在する場合は上書き（再発行/再割当の想定）
    const existIdx = vj.items.findIndex(x => x.vc_id === vcId);
    if (existIdx >= 0) vj.items.splice(existIdx, 1);

    const rec = {
      vc_id: vcId,
      list_id: list.id,
      status_list_index: idx,
      purpose: list.purpose,
      status: 0,
      updated_at: new Date().toISOString()
    };
    vj.items.push(rec);
    writeJson(vcFile, vj);
    return rec;
  },

  async getVcStatus(vcId) {
    const vj = readJson(vcFile);
    return vj.items.find(x => x.vc_id === vcId);
  },

  async markStatus(vcId, statusValue) {
    const vj = readJson(vcFile);
    const rec = vj.items.find(x => x.vc_id === vcId);
    if (!rec) throw new Error('vc not found');
    rec.status = statusValue;
    rec.updated_at = new Date().toISOString();
    writeJson(vcFile, vj);
    return rec;
  }
};

// list 内で status=1（無効）になっている index 一覧（bitset 再構成用）
export async function getRevokedIndexes(listId) {
  const vj = readJson(vcFile);
  return vj.items
    .filter(x => x.list_id === Number(listId) && x.status === 1)
    .map(x => x.status_list_index);
}


// services/publisher.js
// --- public/status/*.json への原子的な書き込み（.tmp → rename） ---
// 複数プロセスでの同時更新は考慮外（単一インスタンス運用を想定）

import fs from 'fs';
import path from 'path';

export async function publishJsonAtomically(objectKey, jsonObj) {
  const publicDir = path.join(process.cwd(), 'public');
  const fullPath = path.join(publicDir, objectKey);  // 例: status/1.json
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tmp = `${fullPath}.tmp-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(jsonObj, null, 2)); // 一時ファイルへ全書き
  fs.renameSync(tmp, fullPath);                            // rename で原子的更新
  return fullPath;
}

// utils/bitstring.js
// --- Bitstring（ビット列）操作 & GZIP+Base64 エンコード、SLC(JSON)生成 ---

import zlib from 'zlib';

// sizeBits 分の 0 で初期化したビット列（Buffer）を作成
export function createZeroBitset(sizeBits) {
  const bytes = Math.ceil(sizeBits / 8);
  return Buffer.alloc(bytes, 0);
}

// 指定 index のビットを 0/1 に設定（上位ビット先行）
export function setBit(bitsetBuf, index, value /*0|1*/) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  const mask = 1 << (7 - bitIndex);
  if (value) {
    bitsetBuf[byteIndex] |= mask;
  } else {
    bitsetBuf[byteIndex] &= ~mask;
  }
}

// 指定 index のビットを取得（0/1）
export function getBit(bitsetBuf, index) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  const mask = 1 << (7 - bitIndex);
  return (bitsetBuf[byteIndex] & mask) ? 1 : 0;
}

// Buffer を GZIP → Base64 文字列へ
export function gzipBase64(buf) {
  return zlib.gzipSync(buf).toString('base64');
}

// StatusListCredential の JSON オブジェクトを生成
export function buildStatusListCredentialJson({ url, purpose, encodedList, issuerDid, validFrom }) {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    "id": url,                                   // 公開 URL（固定・安定が望ましい）
    "type": ["VerifiableCredential", "BitstringStatusListCredential"],
    "issuer": issuerDid,                         // 発行者 DID
    "validFrom": validFrom || new Date().toISOString(),
    "credentialSubject": {
      "id": `${url}#list`,
      "type": "BitstringStatusList",
      "statusPurpose": purpose,                  // 'revocation' / 'suspension' など
      "encodedList": encodedList                 // GZIP+Base64 したビット列
    }
  };
}


