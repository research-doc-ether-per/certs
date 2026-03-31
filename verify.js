
const normalizeSchemaForOpenApi = (schema) => {
  logger.debug('normalizeSchemaForOpenApi start')

  logger.debug('schema: ', schema)
  try {
    if (!schema || typeof schema !== 'object') return null

    const copy = JSON.parse(JSON.stringify(schema))

    const normalizeDescription = (value) => {
      if (typeof value !== 'string') return value

      return value
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .trim()
    }

    const walk = (node) => {
      if (!node || typeof node !== 'object') return

      if (typeof node.description === 'string') {
        node.description = normalizeDescription(node.description)
      }

      if (node.type === 'object') {
        if (!node.properties) node.properties = {}
        for (const k of Object.keys(node.properties)) walk(node.properties[k])
      }

      if (node.type === 'array') {
        if (!node.items) node.items = { type: 'object', properties: {} }
        walk(node.items)
      }

      if (Array.isArray(node.required) && node.required.length === 0) {
        delete node.required
      }
    }

    walk(copy)
    return copy
  } finally {
    logger.debug('normalizeSchemaForOpenApi end')
  }
}
