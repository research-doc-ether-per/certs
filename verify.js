case 'authentication-service': {
  if (params.clientId !== 'waltid_issuer-api') {
    break
  }

  if (!['individual', 'corporate'].includes(status)) {
    throw new Error(
      `Invalid authentication-service status: ${status}`
    )
  }

  // ファイルを UTF-8 で読み込む
  content = fs.readFileSync(fullPath, {
    encoding: 'utf-8',
  })

  // individual または corporate の設定ブロックを取得する
  const blockRegex = new RegExp(
    `(^\\s*${status}\\s*\\{)([\\s\\S]*?)(^\\s*\\})`,
    'm'
  )

  const blockMatch = content.match(blockRegex)

  if (!blockMatch) {
    throw new Error(
      `Authentication configuration block not found: ${status}`
    )
  }

  let blockContent = blockMatch[2]

  // 対象ブロック内の各設定値のみを置き換える
  blockContent = blockContent
    .replace(
      /^(\s*authorizeUrl\s*=\s*)"[^"]*"/m,
      `$1"${params.authorizeUrl}"`
    )
    .replace(
      /^(\s*accessTokenUrl\s*=\s*)"[^"]*"/m,
      `$1"${params.accessTokenUrl}"`
    )
    .replace(
      /^(\s*clientId\s*=\s*)"[^"]*"/m,
      `$1"${params.clientId}"`
    )
    .replace(
      /^(\s*clientSecret\s*=\s*)"[^"]*"/m,
      `$1"${params.clientSecret}"`
    )

  // 更新したブロックを元のファイル内容へ反映する
  content = content.replace(
    blockRegex,
    `${blockMatch[1]}${blockContent}${blockMatch[3]}`
  )

  // 上書き保存
  fs.writeFileSync(fullPath, content, {
    encoding: 'utf-8',
  })

  break
}
