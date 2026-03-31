const isPlaceholderKey = (key) => {
  return typeof key === 'string' && /^\{.+\}$/.test(key)
}

const getDefaultExample = (type) => {
  switch (type) {
    case 'string':
      return ''
    case 'integer':
    case 'number':
      return 0
    case 'boolean':
      return false
    default:
      return ''
  }
}

const safeStringify = (value) => {
  try {
    return JSON.stringify(value)
  } catch (e) {
    return ''
  }
}

const applyExampleToSchema = (schema, exampleData) => {
  if (!schema || typeof schema !== 'object') return

  const walk = (node, currentExample) => {
    if (!node || typeof node !== 'object') return

    const isLeafType = ['string', 'integer', 'number', 'boolean'].includes(node.type)

    if (isLeafType) {
      if (currentExample !== undefined) {
        node.example = currentExample
      } else {
        node.example = getDefaultExample(node.type)
      }
      return
    }

    if (node.type === 'object') {
      const hasProperties =
        node.properties &&
        typeof node.properties === 'object' &&
        Object.keys(node.properties).length > 0

      if (currentExample !== undefined) {
        node.example = safeStringify(currentExample)
      } else {
        node.example = '{}'
      }

      if (!hasProperties) return

      const propertyKeys = Object.keys(node.properties)

      if (
        propertyKeys.length === 1 &&
        isPlaceholderKey(propertyKeys[0]) &&
        currentExample &&
        typeof currentExample === 'object' &&
        !Array.isArray(currentExample)
      ) {
        const placeholderKey = propertyKeys[0]
        const actualExampleKeys = Object.keys(currentExample)

        if (actualExampleKeys.length > 0) {
          const firstActualKey = actualExampleKeys[0]
          walk(node.properties[placeholderKey], currentExample[firstActualKey])
        } else {
          walk(node.properties[placeholderKey], undefined)
        }

        return
      }

      for (const key of propertyKeys) {
        const childExample =
          currentExample &&
          typeof currentExample === 'object' &&
          !Array.isArray(currentExample)
            ? currentExample[key]
            : undefined

        walk(node.properties[key], childExample)
      }

      return
    }

    if (node.type === 'array') {
      const hasItemProperties =
        node.items &&
        node.items.type === 'object' &&
        node.items.properties &&
        Object.keys(node.items.properties).length > 0

      if (Array.isArray(currentExample)) {
        node.example = safeStringify(currentExample)
      } else {
        node.example = '[]'
      }

      if (!node.items || typeof node.items !== 'object') return

      const firstItemExample =
        Array.isArray(currentExample) && currentExample.length > 0
          ? currentExample[0]
          : undefined

      if (hasItemProperties) {
        walk(node.items, firstItemExample)
      } else {
        node.items.example =
          firstItemExample !== undefined ? safeStringify(firstItemExample) : '{}'
      }

      return
    }
  }

  walk(schema, exampleData)
}
