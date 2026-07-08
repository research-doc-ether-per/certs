<Stack
  spacing={0.5}
  sx={{
    minWidth: 0,
    width: '100%',
  }}
>
  <Typography
    component="div"
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      lineHeight: 1.4,
      minWidth: 0,
      width: '100%',
    }}
  >
    <Box component="span" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
      証明書名:
    </Box>
    <Box
      component="span"
      sx={{
        flex: 1,
        minWidth: 0,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {cert.verificationCertData.certName || '不明'}
    </Box>
  </Typography>

  <Typography
    component="div"
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      lineHeight: 1.4,
      minWidth: 0,
      width: '100%',
    }}
  >
    <Box component="span" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
      証明書種別:
    </Box>
    <Box
      component="span"
      sx={{
        flex: 1,
        minWidth: 0,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {cert.typeDisplayName || '不明'}
    </Box>
  </Typography>

  <Typography
    component="div"
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      lineHeight: 1.4,
      minWidth: 0,
      width: '100%',
    }}
  >
    <Box component="span" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
      発行者:
    </Box>
    <Box
      component="span"
      sx={{
        flex: 1,
        minWidth: 0,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {cert.verificationCertData.issuerName ||
        cert.verificationCertData.issuer ||
        '不明'}
    </Box>
  </Typography>
</Stack>
