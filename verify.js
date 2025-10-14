 {
      "policy": "status",
      "args": {
        "discriminator": "ietf",
        "type": "TokenStatusList",
        "value": 0
      }
    }


// ==============================
// 1) IETF: TokenStatusList の公開エンドポイント
//    - 既存のビットセット・圧縮ロジックを再利用
//    - 返却は「JWT（application/jwt）」
// ==============================
import zlib from 'zlib';
import { SignJWT } from 'jose';   // npm i jose

app.get('/token-status/:id', async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const list = await store.getList(listId);         // { purpose, size, url, ... }
    if (!list) return res.status(404).json({ error: 'list not found' });

    const bitset = await store.readBitset(listId);    // Buffer（サイズ = ceil(size/8)）
    const gz = zlib.gzipSync(bitset);
    const encodedList = gz.toString('base64url');     // IETF 側は 'u' プレフィックス不要

    const now = Math.floor(Date.now() / 1000);
    // JWT の payload（最低限でOK）
    const payload = {
      status_list: {
        purpose: list.purpose,     // 例: "revocation"
        size: list.size,           // 例: 65536（ビット数）
        encodedList                // GZIP 後の base64url
      },
      iss: "did:example:issuer",
      iat: now
    };

    // 署名（ここはあなたの鍵・アルゴリズムに合わせて調整）
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
      .sign(PRIVATE_KEY); // jose の KeyLike

    res.type('application/jwt').send(jwt);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// 2) SD-JWT 用: index 割り当て（IETF 形）
//    - 既存の allocateIndex を呼び出し、返却形だけ IETF 用にする
// ============================================
export async function allocateIndexForSdJwt(req, res) {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    const list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const rec = await store.allocateIndex(listId, vcId); // { status_list_index: number }

    // SD-JWT（IETF）では BitstringStatusListEntry ではなく status_list を返す
    return res.json({
      credentialStatus: {
        status_list: {
          idx: rec.status_list_index,                        // 0 始まり index（数値）
          uri: `${BASE_URL}/token-status/${listId}`          // JWT を返すエンドポイント
        }
      }
    });
  } catch (e) {
    if (String(e.message).includes('list is full')) {
      return res.status(409).json({ error: 'list full', message: 'Create a new list via POST /lists.' });
    }
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

