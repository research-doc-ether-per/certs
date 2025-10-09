// list 内で使用済み index 数を返す
export async function countUsed(listId) {
  const vj = readJson(vcFile);
  return vj.items.filter(x => x.list_id === Number(listId)).length;
}

// controllers/statusListController.js（节选・自动轮转版）
export async function allocateIndexForVc(req, res) {
  try {
    const listId = Number(req.params.id);
    const { vcId } = req.body || {};
    if (!vcId) return res.status(400).json({ error: 'vcId required' });

    let list = await store.getList(listId);
    if (!list) return res.status(404).json({ error: 'list not found' });

    const usedCount = await store.countUsed(listId);
    const ratio = usedCount / list.size;

    // ★ 达到阈值则新建下一份（示例规则：沿用 purpose，容量翻倍）
    if (ratio >= 0.8) {
      const next = await store.createList({ purpose: list.purpose, size: list.size * 2 });
      const baseUrl = process.env.BASE_PUBLIC_URL.replace(/\/$/, '');
      const url = `${baseUrl}/${next.id}.json`;
      const objectKey = `status/${next.id}.json`;

      // 初始化全0并发布
      const bitset = createZeroBitset(next.size);
      const encodedList = gzipBase64(bitset);
      const json = buildStatusListCredentialJson({
        url, purpose: next.purpose, encodedList, issuerDid: process.env.ISSUER_DID
      });
      await publishJsonAtomically(objectKey, json);
      await store.updateListUrlAndKey(next.id, { url, objectKey });

      // 用新列表分配索引并返回
      list = next;
      const rec = await store.allocateIndex(next.id, vcId);
      return res.json({
        rotated: true,                       // 告知前端：已自动轮转到新列表
        newListId: next.id,
        credentialStatus: {
          id: `${list.url}#${rec.status_list_index}`,
          type: 'BitstringStatusListEntry',
          statusPurpose: list.purpose,
          statusListIndex: String(rec.status_list_index),
          statusListCredential: list.url
        }
      });
    }

    // 未达阈值：在当前列表分配
    const rec = await store.allocateIndex(list.id, vcId);
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
    // 满了也走自动新建（兜底）
    if (String(e.message).includes('list is full')) {
      // …与上面的“新建并切换”相同逻辑（略，为避免重复可抽函数）
      return res.status(409).json({ error: 'list full and auto-rotation not configured' });
    }
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
