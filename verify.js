const normalizeDescription = (value) => {
  if (typeof value !== 'string') return value

  const lines = value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const result = []
  let inList = false

  for (const line of lines) {
    if (/^[-・•]\s*/.test(line)) {
      if (!inList) {
        result.push('')
        inList = true
      }
      result.push('- ' + line.replace(/^[-・•]\s*/, ''))
    } else {
      if (inList) {
        result.push('') 
        inList = false
      }
      result.push(line)
    }
  }

  return result.join('\n')
}
