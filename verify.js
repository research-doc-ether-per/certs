//リクエストURLのパラメータとして渡されたissuer didが自動的にデコードされるため、各API処理前に再エンコードを行うようにした。
export function ensureDidPortEncoded(did: string): string {
  if (!did.startsWith('did:')) return did;

  const m = did.match(/^did:([a-z0-9]+):(.+)$/i);
  if (!m) return did;

  const method = m[1];
  // 覆盖 web/webvh/webmk…（任意以 web 开头的方法）
  if (!method.toLowerCase().startsWith('web')) return did;

  const rest = m[2];
  const parts = rest.split(':');

  // host、port 在 web 与 web* 的位置不同：
  // did:web:           host:port:...
  // did:webvh/webmk:   <cid>:host:port:...
  const hostIdx = method.toLowerCase() === 'web' ? 0 : 1;
  const portIdx = hostIdx + 1;

  const host = parts[hostIdx];
  const port = parts[portIdx];

  if (!host || !port) return did;                   // 不完整，保持原样
  if (/%3A/i.test(host)) return did;                // 已编码，保持原样
  if (!/^\d{1,5}$/.test(port)) return did;          // 非端口，跳过

  // 组装 host%3Aport，并移除独立的 port 段
  parts[hostIdx] = `${host}%3A${port}`;
  parts.splice(portIdx, 1);

  return `did:${method}:${parts.join(':')}`;
}
