
{certificate?.credentialDetailsInfo &&
  Object.keys(certificate.credentialDetailsInfo).length > 0 &&
  Object.keys(certificate.credentialDetailsInfo).map((key) => (
    <DetailRow
      key={key}
      showStar={certificate.credentialDetailsInfo?.[key]?.star}
      label={`${certificate.credentialDetailsInfo?.[key]?.label}:`}
      value={certificate.credentialDetailsInfo?.[key]?.value || '不明'}
    />
  ))}


return {
  success: true,
  data: {
    issuer,
    ...displayInfo,
    verifyResults: [
      {
        key: 'isCorrectFormat',
        label: 'フォーマット',
        value: verifyResults.isCorrectFormat ?? null,
      },
      {
        key: 'credentialExists',
        label: '真正性',
        value: verifyResults.credentialExists ?? null,
      },
      {
        key: 'isNotRevoked',
        label: '有効状態',
        value: verifyResults.isNotRevoked ?? null,
      },
      {
        key: 'issuerSignatureValid',
        label: '署名',
        value: verifyResults.issuerSignatureValid ?? null,
      },
      {
        key: 'isNotExpired',
        label: '有効期限切れ',
        value: verifyResults.isNotExpired ?? null,
      },
    ],
  },
}

{Array.isArray(certificate?.verifyResults) &&
  certificate.verifyResults.map((item) => (
    <DetailRow
      key={item.key}
      type="verifiedResult"
      label={`${item.label}:`}
      value={item.value}
    />
  ))}
