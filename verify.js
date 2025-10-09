// app.js
// --- アプリ起動と共通ミドルウェア、静的配信、ルータのマウントのみ ---

import 'dotenv/config';
import path from 'path';
import express from 'express';
import router from './routes/index.js';

const app = express();

// JSON ボディ
app.use(express.json());

// 公開静的ファイル: /status/*.json -> public/status/*.json
app.use('/status', express.static(path.join(process.cwd(), 'public/status')));

// ルータ（/auth, /lists など）
app.use('/', router);

// 起動
const port = Number(process.env.PORT || 10010);
app.listen(port, () => {
  console.log(`VC Status API (File) 起動: http://localhost:${port}`);
  console.log(`公開 Status JSON:          http://localhost:${port}/status/`);
});


// routes/index.js
// --- ルーティング定義。controllers と auth ミドルウェアを束ねる ---

import { Router } from 'express';
import { login } from '../controllers/authController.js';
import {
  createStatusList,
  allocateIndexForVc,
  revokeVc,
  restoreVc
} from '../controllers/statusListController.js';
import { auth } from '../auth.js';

const router = Router();

// 認証
router.post('/auth/login', login);

// StatusList 作成（管理API）
router.post('/lists', auth, createStatusList);

// VC 用 index を割り当て（管理API）
router.post('/lists/:id/index', auth, allocateIndexForVc);

// 撤回（bit=1）／復旧（bit=0） （管理API）
router.post('/lists/:id/revoke', auth, revokeVc);
router.post('/lists/:id/restore', auth, restoreVc);

export default router;


// controllers/statusListController.js
// --- /lists 系 API のコントローラ：入力検証 → services を呼び出し → レスポンス形成 ---

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

    // 3) 全0ビット列をエンコードし、SLC(JSON) を構成
    const bitset = createZeroBitset(size);
    const encodedList = gzipBase64(bitset);
    const json = buildStatusListCredentialJson({
      url,
      purpose,
      encodedList,
      issuerDid: process.env.ISSUER_DID
    });

    // 4) 公開ファイルを原子的に書き込み
    await publishJsonAtomically(objectKey, json);

    // 5) ストアに url/objectKey を反映
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

    // 既存の無効 index 群を反映 → 対象 index を 0 に
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



