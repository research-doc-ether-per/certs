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
    case 'object':
      return {}
    case 'array':
      return []
    default:
      return ''
  }
}

const cloneDeep = (value) => JSON.parse(JSON.stringify(value))

const applyExampleToSchema = (schema, exampleData) => {
  if (!schema || typeof schema !== 'object') return

  const walk = (node, currentExample) => {
    if (!node || typeof node !== 'object') return

    const type = node.type
    const hasExample = currentExample !== undefined

    if (['string', 'integer', 'number', 'boolean'].includes(type)) {
      node.example = hasExample ? currentExample : getDefaultExample(type)
      return
    }

    if (type === 'object') {
      const properties = node.properties && typeof node.properties === 'object'
        ? node.properties
        : null
      const propertyKeys = properties ? Object.keys(properties) : []
      const hasProperties = propertyKeys.length > 0

      node.example =
        hasExample &&
        currentExample &&
        typeof currentExample === 'object' &&
        !Array.isArray(currentExample)
          ? cloneDeep(currentExample)
          : {}

      if (!hasProperties) return

      if (
        propertyKeys.length === 1 &&
        isPlaceholderKey(propertyKeys[0]) &&
        hasExample &&
        currentExample &&
        typeof currentExample === 'object' &&
        !Array.isArray(currentExample)
      ) {
        const placeholderKey = propertyKeys[0]
        const templateSchema = properties[placeholderKey]
        const actualKeys = Object.keys(currentExample)

        if (actualKeys.length > 0) {
          const firstActualKey = actualKeys[0]
          walk(templateSchema, currentExample[firstActualKey])
          node.example = cloneDeep(currentExample)
        } else {
          walk(templateSchema, undefined)
          node.example = {}
        }

        return
      }

      // 正常严格匹配
      for (const key of propertyKeys) {
        const childExample =
          hasExample &&
          currentExample &&
          typeof currentExample === 'object' &&
          !Array.isArray(currentExample)
            ? currentExample[key]
            : undefined

        walk(properties[key], childExample)
      }

      return
    }

    if (type === 'array') {
      const items = node.items && typeof node.items === 'object' ? node.items : null

      node.example = Array.isArray(currentExample) ? cloneDeep(currentExample) : []

      if (!items) return

      const firstItemExample =
        Array.isArray(currentExample) && currentExample.length > 0
          ? currentExample[0]
          : undefined

      const itemHasProperties =
        items.type === 'object' &&
        items.properties &&
        typeof items.properties === 'object' &&
        Object.keys(items.properties).length > 0

      if (itemHasProperties) {
        walk(items, firstItemExample)
      } else {
        if (firstItemExample !== undefined) {
          items.example = cloneDeep(firstItemExample)
        } else {
          items.example = items.type ? getDefaultExample(items.type) : {}
        }
      }

      return
    }
  }

  walk(schema, exampleData)
}
