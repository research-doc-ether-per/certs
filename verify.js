//リクエストURLのパラメータとして渡されたissuer didが自動的にデコードされるため、各API処理前に再エンコードを行うようにした。
export function ensureDidPortEncoded(did: string): string {
  if (!did.startsWith('did:')) return did;

  const i = did.indexOf(':', 4); // after "did:"
  if (i < 0) return did;

  const method = did.slice(4, i);
  if (!/^web/i.test(method)) return did;

  const msi = did.slice(i + 1);

  // すでにエンコード済みならそのまま
  if (/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9.-]+)%3A\d{1,5}:/.test(msi)) {
    return did;
  }

  // host:port → host%3Aport
  const replaced = msi.replace(
    /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9.-]+):(\d{1,5}):/,
    (match) => {
      const parts = match.split(':');
      if (parts.length >= 3) {
        const host = parts[0];
        const port = parts[1];
        return `${host}%3A${port}:`;
      }
      return match;
    }
  );

  return replaced === msi ? did : `did:${method}:${replaced}`;
}
