const trimValue = (value) => {
  return String(value ?? '').replace(/^[\s\u00A0\u200B\uFEFF　]+|[\s\u00A0\u200B\uFEFF　]+$/g, '')
}
