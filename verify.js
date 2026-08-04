
{Array.isArray(selectedDetail?.fieldsFormat) &&
  selectedDetail.fieldsFormat.map((field) => {
    const key = field.key

    // 基本情報として上に表示している場合は重複表示しない
    if (key === 'certName') {
      return null
    }

    const value = selectedDetail?.credentialInformation?.[key]

    if (value === null || value === undefined || value === '') {
      return null
    }

    const showStar =
      selectedDetail?.credentialInformation?.disclosureKeys?.includes(key)

    return (
      <DetailRow
        key={key}
        showStar={showStar}
        label={`${field.name || key}:`}
        value={formatFieldValue(value, field) || '不明'}
      />
    )
  })}
