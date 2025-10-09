// app.js
// --- VC Status 管理 API（ファイル保存版） ---
// 公開:   GET /status/:id.json  -> public/status/*.json を静的配信
// 管理系: POST /auth/login      -> JWT を発行
//        POST /lists            -> 新しい StatusList 作成（encodedList=全0 を公開）
//        POST /lists/:id/index  -> VC 用 index を割り当て（credentialStatus 片を返す）
//        POST /lists/:id/revoke -> 指定 VC を無効化（bit=1）し、encodedList を再生成・公開
//        POST /lists/:id/restore-> 指定 VC を再有効化（bit=0）し、encodedList を再生成・公開

import 'dotenv/config';
import path from 'path';
import express from 'express';
import { loginHandler, auth } from './auth.js';
import {
  store,
  getRevokedIndexes
} from './services/store.js';
import { publishJsonAtomically } from './services/publisher.js';
import {
  createZeroBitset, setBit, gzipBase64, buildStatusListCredentialJson
} from './utils/bitstring.js';

const app = express();
app.use(express.json());

// 公開静的ファイル: /status/*.json -> public/status/*.json
app.use('/status', express.static(path.join(process.cwd(), 'public/status')));

// 管理ログイン: JWT 発行
app.post('/auth/login', loginHandler);

// StatusList 作成（初期は全 0 のビット列を公開）
app.post('/lists', auth, async (req, res) => {
  try {
    const { purpose = 'revocation', size = 1000 } = req.body || {};

    // 1) まずローカルストアにレコードを作成（url/objectKey は後で設定）
    const provisional = await store.createList({ purpose, size });

    // 2) 公開 URL/ファイルパスを確定
    const baseUrl = process.env.BASE_PUBLIC_URL.replace(/\/$/, '');
    const url = `${baseUrl}/${provisional.id}.json`;
    const objectKey = `status/${provisional.id}.json`;

    // 3) 全 0 ビット列を GZIP+Base64 にして JSON を構築
    const bitset = createZeroBitset(size);
    const encodedList = gzipBase64(bitset);
    const json = buildStatusListCredentialJson({
      url,
      purpose,
      encodedList,
      issuerDid: process.env.ISSUER_DID
    });

    // 4) public/status に原子的に書き込み（公開用）
    await publishJsonAtomically(objectKey, json);

    // 5) ストアに url/objectKey を反映
    const finalList = await store.updateListUrlAndKey(provisional.id, { url, objectKey });

    return res.json({ ok: true, list: finalList, publicUrl: url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// VC 用 index を割り当て：返値は VC の credentialStatus にそのまま埋め込める
app.post('/lists/:id/index', auth, async (req, res) => {
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
    res.status(500).json({ error: e.message });
  }
});

// 無効化（撤回/停止）：該当ビットを 1 にして encodedList を再生成 → 公開 JSON を上書き
app.post('/lists/:id/revoke', auth, async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    const list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const rec = await store.getVcStatus(vcId);
    if (!rec || rec.list_id !== listId) return res.status(404).json({ error: 'vc not found in this list' });

    // 現在 status=1 の index 群を取り出し、bitset を再構成し、対象を 1 に
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
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 復旧（再有効化）：該当ビットを 0 にして再生成・公開
app.post('/lists/:id/restore', auth, async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    const list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const rec = await store.getVcStatus(vcId);
    if (!rec || rec.list_id !== listId) return res.status(404).json({ error: 'vc not found in this list' });

    // 現在 status=1 の index 群を反映後、当該 VC のビットのみ 0 に
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
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const port = Number(process.env.PORT || 10010);
app.listen(port, () => {
  console.log(`VC Status API (File) 起動: http://localhost:${port}`);
  console.log(`公開 Status JSON:          http://localhost:${port}/status/`);
});
