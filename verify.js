const InfoRow = ({ label, value }) => (
  <Typography
    component="div"
    sx={{
      display: 'flex',
      flexDirection: {
        xs: 'column',
        sm: 'row',
      },
      alignItems: {
        xs: 'stretch',
        sm: 'flex-start',
      },
      gap: {
        xs: 0,
        sm: '0.5rem',
      },
      lineHeight: 1.4,
      width: '100%',
      minWidth: 0,
    }}
  >
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {label}:
    </Box>

    <Box
      component="span"
      sx={{
        minWidth: 0,
        textAlign: {
          xs: 'right',
          sm: 'left',
        },
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {value || '不明'}
    </Box>
  </Typography>
)



<Stack spacing={0.5} sx={{ width: '100%', minWidth: 0 }}>
  <InfoRow
    label="証明書名"
    value={cert.verificationCertData.certName}
  />

  <InfoRow
    label="証明書種別"
    value={cert.typeDisplayName}
  />

  <InfoRow
    label="発行者"
    value={
      cert.verificationCertData.issuerName ||
      cert.verificationCertData.issuer
    }
  />
</Stack>


