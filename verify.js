<Stack spacing={0.25}>
  <Typography
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      lineHeight: 1.4,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
      minWidth: 0,
    }}
  >
    <Box component="span" sx={{ flexShrink: 0 }}>
      証明書名:
    </Box>
    <Box component="span" sx={{ minWidth: 0 }}>
      {cert.verificationCertData.certName || '不明'}
    </Box>
  </Typography>

  <Typography
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      lineHeight: 1.4,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
      minWidth: 0,
    }}
  >
    <Box component="span" sx={{ flexShrink: 0 }}>
      証明書種別:
    </Box>
    <Box component="span" sx={{ minWidth: 0 }}>
      {cert.typeDisplayName || '不明'}
    </Box>
  </Typography>

  <Typography
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      lineHeight: 1.4,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
      minWidth: 0,
    }}
  >
    <Box component="span" sx={{ flexShrink: 0 }}>
      発行者:
    </Box>
    <Box
      component="span"
      sx={{
        minWidth: 0,
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {cert.verificationCertData.issuerName
        ? cert.verificationCertData.issuerName
        : cert.verificationCertData.issuer
          ? cert.verificationCertData.issuer
          : '不明'}
    </Box>
  </Typography>
</Stack>
