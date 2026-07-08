<Stack
  spacing={1}
  sx={{
    flex: 1,
    minWidth: 0,
  }}
>
  {/* 1行目：証明書名 */}
  <Typography
    variant="body1"
    sx={{
      minWidth: 0,
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    }}
  >
    {offer.certName ? offer.certName : ''}
  </Typography>

  {/* 2行目：種別 + 発行日時 */}
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      columnGap: 2,
      alignItems: 'start',
      width: '100%',
      minWidth: 0,
    }}
  >
    <Typography
      variant="body1"
      sx={{
        minWidth: 0,
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      {offer.typeDisplayName ? offer.typeDisplayName : '不明'}
    </Typography>

    <Typography
      variant="body1"
      color="text.secondary"
      sx={{
        minWidth: 0,
        textAlign: 'right',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      発行日時: {getDate(offer.createDate)}
    </Typography>
  </Box>

  {/* 3行目：発行者 + 発行期限 */}
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      columnGap: 2,
      alignItems: 'start',
      width: '100%',
      minWidth: 0,
    }}
  >
    <Typography
      variant="body1"
      sx={{
        minWidth: 0,
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      発行者: {offer.name ? offer.name : '不明'}
    </Typography>

    <Typography
      variant="body1"
      color="text.secondary"
      sx={{
        minWidth: 0,
        textAlign: 'right',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}
    >
      発行期限:
      {offer.createDate
        ? offer.credentialOfferUrl
          ? getDate(offer.createDate + 5 * 60)
          : '無期限'
        : ''}
    </Typography>
  </Box>
</Stack>
