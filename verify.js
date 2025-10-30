//リクエストURLのパラメータとして渡されたissuer didが自動的にデコードされるため、各API処理前に再エンコードを行うようにした。
export function ensureDidPortEncoded(did: string): string {
  if (!did.startsWith('did:')) return did;

  const i = did.indexOf(':', 4); // after "did:"
  if (i < 0) return did;

  const method = did.slice(4, i);
  if (!/^web/i.test(method)) return did;

  const msi = did.slice(i + 1);

  // すでに host%3Aport:... なら無変更
  if (/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9.-]+)%3A\d{1,5}:/.test(msi)) {
    return did;
  }

  // 先頭が host:port:... の形なら %3A に置換
  const replaced = msi.replace(
    /^(?<host>(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9.-]+)):(?<port>\d{1,5}):/,
    (_m, _host, _port, g: any) => `${g.host}%3A${g.port}:`
  );

  return replaced === msi ? did : `did:${method}:${replaced}`;
}
