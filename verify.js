
// utils/didutil.ts
// utils/didutil.ts

/**
 * did:web系のDIDで、host:port を host%3Aport に正規化する。
 * すでに%3Aなら変更しない。web/webvh/webmkなどweb系のみ対象。
 * 入口で一度呼び、以降は正規化済みDIDを使う。
 */
export function ensureDidPortEncoded(did: string): string {
  if (!did.startsWith('did:')) return did;

  const firstColon = did.indexOf(':', 4); // "did:" の直後から
  if (firstColon < 0) return did;

  const method = did.slice(4, firstColon);
  const msi = did.slice(firstColon + 1);

  // web 系のみ
  if (!/^web/i.test(method)) return did;

  // MSIの最初のセグメント（host[:port]）
  const nextColon = msi.indexOf(':');
  const firstSegEnd = nextColon === -1 ? msi.length : nextColon;
  const firstSeg = msi.slice(0, firstSegEnd);

  // 既に%3Aを含むならそのまま
  if (/%3A/i.test(firstSeg)) return did;

  // host:port → host%3Aport
  const encodedFirstSeg = firstSeg.replace(
    /^(?<host>(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9.-]+)):(?<port>\d{1,5})$/,
    (_m, _host, _port, g: any) => `${g.host}%3A${g.port}`
  );

  if (encodedFirstSeg === firstSeg) return did;

  const newMsi = encodedFirstSeg + (nextColon === -1 ? '' : msi.slice(firstSegEnd));
  return `did:${method}:${newMsi}`;
}
