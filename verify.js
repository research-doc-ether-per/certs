const safeStringify = (value) => {
  try {
    return JSON.stringify(value)
  } catch (e) {
    return ''
  }
}

const applyExampleToSchema = (schema, exampleData) => {
  if (!schema || typeof schema !== 'object') return

  const walk = (node, example) => {
    if (!node || typeof node !== 'object') return

    const isLeafType = ['string', 'integer', 'number', 'boolean'].includes(node.type)

    if (isLeafType) {
      if (example !== undefined) {
        node.example = example
      } else {
        if (node.type === 'string') node.example = ''
        if (node.type === 'integer' || node.type === 'number') node.example = 0
        if (node.type === 'boolean') node.example = false
      }
      return
    }

    if (node.type === 'object') {
      const hasProperties =
        node.properties &&
        typeof node.properties === 'object' &&
        Object.keys(node.properties).length > 0

      if (hasProperties) {
        for (const key of Object.keys(node.properties)) {
          const childExample =
            example && typeof example === 'object' ? example[key] : undefined
          walk(node.properties[key], childExample)
        }
      } else {
        node.example = example !== undefined ? safeStringify(example) : '{}'
      }

      return
    }

    if (node.type === 'array') {
      const hasItemProperties =
        node.items &&
        node.items.type === 'object' &&
        node.items.properties &&
        Object.keys(node.items.properties).length > 0

      if (hasItemProperties) {
        if (Array.isArray(example) && example.length > 0) {
          walk(node.items, example[0])
          node.example = safeStringify(example.slice(0, 1))
        } else {
          walk(node.items, undefined)
          node.example = '[]'
        }
      } else {
        if (Array.isArray(example)) {
          node.example = safeStringify(example.slice(0, 1))
        } else {
          node.example = '[]'
        }
      }

      return
    }
  }

  walk(schema, exampleData)
}
