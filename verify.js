const removeSpaces = (value) => {
  return String(value ?? '').replace(/[\s　]/g, '')
}


  const apiName = trimValue(row[0])
  const apiId = trimValue(row[1])
  const apiPath = trimValue(row[2])
  const method = trimValue(row[3])
