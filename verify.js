
// utils/didutil.ts
export function ensureDidPortEncoded(did: string): string {
  if (!did.startsWith('did:')) return did;


  const firstColon = did.indexOf(':', 4);
  if (firstColon < 0) return did;

  const method = did.slice(4, firstColon);
  const msi = did.slice(firstColon + 1);
  
  if (!/^web/i.test(method)) return did;

  const nextColon = msi.indexOf(':');
  const firstSegEnd = nextColon === -1 ? msi.length : nextColon;
  const firstSeg = msi.slice(0, firstSegEnd);


  if (firstSeg.includes('%3A') || firstSeg.includes('%3a')) return did;

  const encodedFirstSeg = firstSeg.replace(
    /^(?<host>(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9.-]+)):(?<port>\d{1,5})$/,
    (_m, _host, _port, groups: any) => `${groups.host}%3A${groups.port}`
  );

  if (encodedFirstSeg === firstSeg) {
    return did;
  }

  const newMsi = encodedFirstSeg + (nextColon === -1 ? '' : msi.slice(firstSegEnd));
  return `did:${method}:${newMsi}`;
}
