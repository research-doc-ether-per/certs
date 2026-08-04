const getDisplayContent = () => {
  // 未入力なら「未入力」と表示
  if (!dynamicFormData || Object.keys(dynamicFormData).length === 0) {
    return '証明内容未入力'
  }

  // フォーム定義がない場合は、詳細な項目名変換ができないため簡易表示にする
  if (!fetchedCredentialFields || fetchedCredentialFields.length === 0) {
    return '証明内容フォームで入力済み'
  }

  const contentLines = []

  // fetchedCredentialFields の順序で表示する
  fetchedCredentialFields.forEach((field) => {
    const key = field.key
    const value = dynamicFormData[key]

    if (value === undefined || value === null || value === '') {
      return
    }

    const fieldName = field.label || field.name || key

    // select の場合は value を表示ラベルに変換する
    if (field.type === 'select' && Array.isArray(field.item)) {
      const item = field.item.find((i) => i.value === String(value))
      contentLines.push(`${fieldName}: ${item ? item.disp : value}`)
      return
    }

    contentLines.push(`${fieldName}: ${value}`)
  })

  return contentLines.length > 0
    ? contentLines.join('\n')
    : '証明内容未入力'
}
