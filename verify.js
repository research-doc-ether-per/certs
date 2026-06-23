const now = new Date();
const baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

// IACA期間の設定（開始：本日 / 終了：19年+360日後 ※20年超過エラー回避）
const iacaNotBefore = baseDate.toISOString(); 
const iacaExpiryDate = new Date(baseDate.getTime());
iacaExpiryDate.setUTCDate(iacaExpiryDate.getUTCDate() + (19 * 365 + 360));
const iacaNotAfter = iacaExpiryDate.toISOString();

// Document Signer期間の設定（開始：本日 / 終了：365日後 ※457日以内）
const dsNotBefore = baseDate.toISOString();
const dsExpiryDate = new Date(baseDate.getTime());
dsExpiryDate.setUTCDate(dsExpiryDate.getUTCDate() + 365);
const dsNotAfter = dsExpiryDate.toISOString();
