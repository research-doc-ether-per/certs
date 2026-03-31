const normalizeDescription = (value) => {
  if (typeof value !== 'string') return value;

  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      return /[-–—・•]$/.test(trimmed) ? trimmed + '  ' : trimmed;
    })
    .join('\n')
    .trim();
};
