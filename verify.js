import zlib from 'zlib';

/**
 * encodedList の整合性チェック（公開前のセルフテスト）
 * - 仕様: encodedList は「Multibase base64url」形式（先頭に 'u'）
 * - 仕様: 中身は GZIP 圧縮されたビット列で、解凍後のバイト長は sizeBits/8（切り上げ）と一致すること
 *
 * @param {string} encodedList - 'u' + base64url な文字列（例: "uH4sIA..."）
 * @param {number} sizeBits    - ステータスリストのビット数（= 同時管理できる VC 枚数）
 * @throws {Error} 形式や長さが不正な場合に例外を投げる
 */
export function assertEncodedListLength(encodedList, sizeBits) {
  // 必須: Multibase の base64url は先頭が 'u'
  if (!encodedList || encodedList[0] !== 'u') {
    throw new Error("encodedList は 'u' で始まる Multibase base64url である必要があります");
  }

  // 期待されるバイト数: sizeBits を 8 で割って切り上げ
  const expectBytes = Math.ceil(sizeBits / 8);

  // 'u' を外して base64url → Buffer
  const gz = Buffer.from(encodedList.slice(1), 'base64url');

  // GZIP 解凍（無効なデータならここで例外が発生）
  const raw = zlib.gunzipSync(gz);

  // 解凍後のバイト長が期待値と一致するか検証
  if (raw.length !== expectBytes) {
    throw new Error(`encodedList の長さが不正: 実際 ${raw.length} bytes / 期待 ${expectBytes} bytes (sizeBits=${sizeBits})`);
  }
}
