/**
 * 设定 index 的比特值
 * @param {Buffer} buf
 * @param {number} index 0-based
 * @param {0|1|boolean} bit 1=set, 0=clear
 * @param {{order?: 'lsb'|'msb'}} [opt]
 * @returns {Buffer}
 */
function setBit(buf, index, bit, opt = {}) {
  const order = opt.order ?? 'lsb';        // ← 保持既有默认
  const byteIndex = Math.floor(index / 8);
  const within    = index % 8;             // 0..7
  const bitIndex  = order === 'msb' ? (7 - within) : within;
  const mask = 1 << bitIndex;
  if (bit) buf[byteIndex] |= mask; else buf[byteIndex] &= ~mask;
  return buf;
}

/**
 * 读取 index 的比特值
 * @param {Buffer} buf
 * @param {number} index 0-based
 * @param {{order?: 'lsb'|'msb'}} [opt]
 * @returns {0|1}
 */
function getBit(buf, index, opt = {}) {
  const order = opt.order ?? 'lsb';
  const byteIndex = Math.floor(index / 8);
  const within    = index % 8;
  const bitIndex  = order === 'msb' ? (7 - within) : within;
  return (buf[byteIndex] >> bitIndex) & 1;
}
