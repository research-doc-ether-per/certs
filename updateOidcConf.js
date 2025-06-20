
 text = text.replace(
    /enabledFeatures\s*=\s*\[([\s\S]*?)\]/,
    (match, inner) => {
      // 1. 提取现有 feature（去掉注释与空行）
      const items = inner
        .split(/\r?\n/)
        .map(line => line.trim().replace(/^#.*$/, '').replace(/,$/, ''))
        .filter(line => line) // 非空
      // 2. 如果还没有 oidc，就加进去
      if (!items.includes('oidc')) {
        items.push('oidc')
      }
      // 3. 重新拼回 enabledFeatures 块
      const body = items.map(f => `    ${f},`).join('\n')
      return `enabledFeatures = [\n${body}\n]`
    }
  )
