  const order = (format === 'sd-jwt') ? 'msb' : 'lsb';

    for (const idx of revoked) setBit(bitset, idx, 1, { order });
