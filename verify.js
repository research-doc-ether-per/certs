// routes/index.js
// --- ルーティング定義（デモ用：認証なし） ---
// 基本パス：
//   POST /lists             -> StatusList の新規作成（初期 encodedList=全0 を公開）
//   POST /lists/:id/index   -> VC 用の空き index を 1 つ割当（credentialStatus 片を返す）
//   POST /lists/:id/revoke  -> 指定 VC を無効化（ビット=1）して公開 JSON を再生成
//   POST /lists/:id/restore -> 指定 VC を再有効化（ビット=0）して公開 JSON を再生成

import { Router } from 'express';
import {
  createStatusList,
  allocateIndexForVc,
  revokeVc,
  restoreVc
} from '../controllers/statusListController.js';

const router = Router();

// StatusList 作成（管理 API）
// リクエスト例: { "purpose":"revocation", "size": 32000 }
// レスポンス例: { ok:true, publicUrl:"http://.../status/1.json", list:{...} }
router.post('/lists', createStatusList);

// VC 用 index を割当（管理 API）
// リクエスト例: { "vcId": "VC_001" }
// レスポンス例: { "credentialStatus": { type:"BitstringStatusListEntry", statusListIndex:"123", ... } }
router.post('/lists/:id/index', allocateIndexForVc);

// 無効化（撤回/一時停止の意味付けは purpose に依存）
// リクエスト例: { "vcId": "VC_001" } -> 当該 VC の index を 1 にして公開 JSON を再発行
router.post('/lists/:id/revoke', revokeVc);

// 再有効化（ビットを 0 に戻す）
// リクエスト例: { "vcId": "VC_001" }
router.post('/lists/:id/restore', restoreVc);

export default router;


// controllers/statusListController.js
// --- /lists 系 API のコントローラ：入力検証 → services 呼び出し → レスポンス形成 ---
// 重要ポイント：
// ・StatusList は「BitstringStatusListCredential(JSON)」として /status/:id.json に公開される
// ・VC の credentialStatus には「どの URL の何番目のビットを見るか」を書く
// ・検証側はその URL の JSON を取り、encodedList を展開して該当ビットを判定（0=有効, 1=無効）
// ・本デモは認証なし。実運用では認証/認可と監査ログの実装を推奨

import {
  store,
  getRevokedIndexes
} from '../services/store.js';
import { publishJsonAtomically } from '../services/publisher.js';
import {
  createZeroBitset, setBit, gzipBase64, buildStatusListCredentialJson
} from '../utils/bitstring.js';

/**
 * POST /lists
 * 新しい StatusList を作成し、初期 encodedList=全0 の JSON を public/status/:id.json に公開する。
 * - 入力: { purpose?: "revocation" | "suspension" | string, size?: number }
 * - 出力: { ok: true, publicUrl: string, list: {...} }
 * - 例外: BASE_PUBLIC_URL 未設定やファイル書込失敗時は 500
 *
 * 運用ノウハウ:
 * - size は事前に見積もり（想定発行量）に応じて選択。大きすぎると毎回の圧縮/配信が重くなる。
 * - 大規模では複数の StatusList に分割（シャーディング）するのが定石。
 */
export async function createStatusList(req, res) {
  try {
    const { purpose = 'revocation', size = 1000 } = req.body || {};

    // 1) ストアに新規作成（url/objectKey は後で設定）
    const provisional = await store.createList({ purpose, size });

    // 2) 公開 URL とオブジェクトキーを決定
    const baseUrl = process.env.BASE_PUBLIC_URL?.replace(/\/$/, '') || '';
    if (!baseUrl) return res.status(500).json({ error: 'BASE_PUBLIC_URL not set' });

    const url = `${baseUrl}/${provisional.id}.json`;  // 例: http://localhost:10010/status/1.json
    const objectKey = `status/${provisional.id}.json`; // 物理ファイル: public/status/1.json

    // 3) 全0ビット列 → GZIP+Base64 → SLC(JSON) 生成
    const bitset = createZeroBitset(size);
    const encodedList = gzipBase64(bitset);
    const json = buildStatusListCredentialJson({
      url,
      purpose,
      encodedList,
      issuerDid: process.env.ISSUER_DID
    });

    // 4) 公開ファイルへ原子的書込み（tmp → rename）
    await publishJsonAtomically(objectKey, json);

    // 5) ストアに url/objectKey を反映（この段階で初めて「公開済み」とみなす）
    const finalList = await store.updateListUrlAndKey(provisional.id, { url, objectKey });

    return res.json({ ok: true, list: finalList, publicUrl: url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

/**
 * POST /lists/:id/index
 * 指定 list に対して空き index を 1 つ割り当て、VC 側に埋め込む credentialStatus 片を返す。
 * - 入力: { vcId: string }  // VC を識別する内部ID（業務系IDでOK）
 * - 出力: { credentialStatus: { id,type,statusPurpose,statusListIndex,statusListCredential } }
 *   -> そのまま VC の credentialStatus フィールドに挿入すればよい
 *
 * 注意:
 * - 同じ VC に対して再度呼ぶと、デフォルトでは上書き割当（前の index を解放しない簡易仕様）。
 * - 厳密運用では「再発行ポリシー」に応じて動作を調整（ログ、重複防止、寿命管理など）。
 */
export async function allocateIndexForVc(req, res) {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    const list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const rec = await store.allocateIndex(listId, vcId);

    // 返す JSON は VC の credentialStatus に「そのまま」埋め込める形にする
    return res.json({
      credentialStatus: {
        id: `${list.url}#${rec.status_list_index}`,     // 一意な識別用に #index を付与（リソース実体ではない）
        type: 'BitstringStatusListEntry',               // 入口の型（リスト本体ではない）
        statusPurpose: list.purpose,                    // "revocation" 等
        statusListIndex: String(rec.status_list_index), // 文字列で返す慣習
        statusListCredential: list.url                  // 公開 JSON の URL
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

/**
 * POST /lists/:id/revoke
 * 指定 VC を「無効化（撤回/停止）」する：該当 index のビットを 1 にし、encodedList を再生成して公開 JSON を上書き。
 * - 入力: { vcId: string }
 * - 出力: { ok: true }
 *
 * 実装方針（簡易で堅い）:
 * - DB を使わないため、毎回「status=1 の index 一覧」を読み、bitset をゼロから再構成 → 現在対象も 1 に → 再発行。
 * - 長所: 状態の冪等性と可視化が簡単、壊れてもファイルから再構成可能。
 * - 短所: 更新頻度が高いと圧縮・書き換えコストがかかる（→ バッチ化や分割で緩和）。
 */
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

    // 再エンコード → JSON 再生成 → 公開ファイルを原子的更新
    const encodedList = gzipBase64(bitset);
    const json = buildStatusListCredentialJson({
      url: list.url,
      purpose: list.purpose,
      encodedList,
      issuerDid: process.env.ISSUER_DID
    });
    await publishJsonAtomically(list.object_key, json);

    // ストア（管理用メタ）も同期
    await store.markStatus(vcId, 1);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

/**
 * POST /lists/:id/restore
 * 指定 VC を「再有効化」する：該当 index のビットを 0 にし、encodedList を再生成して公開 JSON を上書き。
 * - 入力: { vcId: string }
 * - 出力: { ok: true }
 *
 * 注意:
 * - restore は「間違って revoke した」「期間限定の停止を解除」等の運用向け。
 * - 監査ログや操作権限の管理は本デモには未実装（実運用で必須）。
 */
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
// ファイル構成：
//  data/status_lists.json: { seq: <number>, items: [ {id, purpose, size, url, object_key, version, created_at} ] }
//  data/vc_status.json   : { items: [ {vc_id, list_id, status_list_index, purpose, status, updated_at} ] }
// 注意：
// ・単一プロセス前提。複数インスタンスで同じファイルを同時更新すると整合性が崩れる。
// ・本番では DB（Postgres 等）やオブジェクトストレージ（S3/MinIO）を推奨。

import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const listsFile = path.join(dataDir, 'status_lists.json');
const vcFile = path.join(dataDir, 'vc_status.json');

// 初期化（ファイルが無い場合は生成）
function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(listsFile)) fs.writeFileSync(listsFile, JSON.stringify({ seq: 0, items: [] }, null, 2));
  if (!fs.existsSync(vcFile)) fs.writeFileSync(vcFile, JSON.stringify({ items: [] }, null, 2));
}
ensureFiles();

// JSON ファイル読み書き（同期 I/O: デモ簡便化のため）
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }

export const store = {
  /**
   * StatusList を新規作成（url/objectKey は後から設定）
   * @param {object} param0 { purpose, size }
   * @returns {object} rec { id, purpose, size, url:'', object_key:'', ... }
   */
  async createList({ purpose, size, url, objectKey }) {
    const j = readJson(listsFile);
    const id = ++j.seq; // 自動採番
    const rec = {
      id, purpose, size,
      url: url || '',                 // 公開 URL（後で確定）
      object_key: objectKey || '',    // 物理ファイルキー（後で確定）
      version: 1,
      created_at: new Date().toISOString()
    };
    j.items.push(rec);
    writeJson(listsFile, j);
    return rec;
  },

  /**
   * 作成済み list に url/objectKey を付与
   */
  async updateListUrlAndKey(id, { url, objectKey }) {
    const j = readJson(listsFile);
    const idx = j.items.findIndex(x => x.id === Number(id));
    if (idx < 0) throw new Error('list not found');
    j.items[idx].url = url;
    j.items[idx].object_key = objectKey;
    writeJson(listsFile, j);
    return j.items[idx];
  },

  /**
   * list 1 件取得
   */
  async getList(id) {
    const j = readJson(listsFile);
    return j.items.find(x => x.id === Number(id));
  },

  /**
   * list 全件取得（デバッグ用）
   */
  async listAll() {
    return readJson(listsFile).items;
  },

  /**
   * 指定 list に空き index を割り当てる
   * 方針: 0..size-1 を線形走査して未使用の最小値を選ぶ（簡易実装）
   *   - 既に同じ vc_id がある場合は上書き（再発行シナリオを想定）
   */
  async allocateIndex(listId, vcId) {
    const list = await this.getList(listId);
    if (!list) throw new Error('list not found');

    const vj = readJson(vcFile);
    const used = new Set(vj.items.filter(x => x.list_id === list.id).map(x => x.status_list_index));

    // 最小の空き index を探索
    let idx = 0;
    while (idx < list.size) {
      if (!used.has(idx)) break;
      idx++;
    }
    if (idx >= list.size) throw new Error('list is full');

    // 既存 vc_id の行があれば削除（上書き割当）
    const existIdx = vj.items.findIndex(x => x.vc_id === vcId);
    if (existIdx >= 0) vj.items.splice(existIdx, 1);

    const rec = {
      vc_id: vcId,
      list_id: list.id,
      status_list_index: idx,
      purpose: list.purpose,
      status: 0, // 0=有効（デフォルト）
      updated_at: new Date().toISOString()
    };
    vj.items.push(rec);
    writeJson(vcFile, vj);
    return rec;
  },

  /**
   * vc_id から 1 件取得
   */
  async getVcStatus(vcId) {
    const vj = readJson(vcFile);
    return vj.items.find(x => x.vc_id === vcId);
  },

  /**
   * 指定 VC の status を更新（0=有効, 1=無効）
   */
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

/**
 * list 内で status=1（無効）になっている index 一覧（bitset 再構成用）
 * 返値: number[] 例) [5, 12, 287, ...]
 */
export async function getRevokedIndexes(listId) {
  const vj = readJson(vcFile);
  return vj.items
    .filter(x => x.list_id === Number(listId) && x.status === 1)
    .map(x => x.status_list_index);
}


// services/publisher.js
// --- public/status/*.json への原子的な書き込みユーティリティ ---
// 手順: 一時ファイルに全書き → rename で置換（同一ファイル名の原子的更新）
// 注意:
// ・単一プロセス前提。複数プロセス/コンテナで同時更新すると競合が起き得る。
// ・S3/MinIO に置き換える場合は、同様に一貫性とキャッシュ制御（ETag/Cache-Control）を考慮する。

import fs from 'fs';
import path from 'path';

export async function publishJsonAtomically(objectKey, jsonObj) {
  const publicDir = path.join(process.cwd(), 'public');
  const fullPath = path.join(publicDir, objectKey);  // 例: status/1.json
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 一時ファイルに書き出し
  const tmp = `${fullPath}.tmp-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(jsonObj, null, 2), 'utf8');

  // rename は多くのFSでほぼ原子的に行われる
  fs.renameSync(tmp, fullPath);
  return fullPath;
}

// utils/bitstring.js
// --- Bitstring（ビット列）操作 & GZIP+Base64 エンコード、SLC(JSON)生成 ---
// 仕様メモ：
// ・Bitstring は「0=有効, 1=無効（撤回/停止）」の意味付けで扱うのが一般的（運用定義に依存）
// ・encodedList は「ビット列(Buffer)を gzip 圧縮して Base64 文字列化」したもの
// ・StatusListCredential は VC v2 の JSON 構造に従い、credentialSubject.type=BitstringStatusList を持つ

import zlib from 'zlib';

/**
 * 指定ビット長 sizeBits の 0 初期化ビット列（Buffer）
 * 例: sizeBits=16 -> Buffer長=2バイト（全0）
 */
export function createZeroBitset(sizeBits) {
  const bytes = Math.ceil(sizeBits / 8);
  return Buffer.alloc(bytes, 0);
}

/**
 * 指定 index のビットを 0/1 に設定（ビット順は「上位ビット→下位ビット」）
 * 例: index=0 -> 対象バイトの最上位ビット（0x80）
 */
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

/**
 * 指定 index のビット値を取得（0/1）
 */
export function getBit(bitsetBuf, index) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  const mask = 1 << (7 - bitIndex);
  return (bitsetBuf[byteIndex] & mask) ? 1 : 0;
}

/**
 * Buffer を gzip 圧縮 → Base64 文字列へ
 * 注意: 検証側はこの Base64 を decode → gunzip → Buffer で元に戻す。
 */
export function gzipBase64(buf) {
  return zlib.gzipSync(buf).toString('base64');
}

/**
 * StatusListCredential(JSON) を組み立てるヘルパ
 * - url: 公開URL（VC の credentialStatus.statusListCredential から参照される）
 * - purpose: 'revocation' / 'suspension' など（用途セマンティクス）
 * - encodedList: gzip+base64 したビット列
 * - issuerDid: 発行体の DID
 * - validFrom: 任意。省略時は現在時刻。
 */
export function buildStatusListCredentialJson({ url, purpose, encodedList, issuerDid, validFrom }) {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    "id": url,
    "type": ["VerifiableCredential", "BitstringStatusListCredential"],
    "issuer": issuerDid,
    "validFrom": validFrom || new Date().toISOString(),
    "credentialSubject": {
      "id": `${url}#list`,
      "type": "BitstringStatusList",
      "statusPurpose": purpose,
      "encodedList": encodedList
    }
  };
}

