<Stack spacing={1}>
  <Typography variant="body1">
    {offer.certName ? (
      <EllipsisTooltip text={offer.certName} maxChars={40} />
    ) : (
      ''
    )}
  </Typography>

  <Stack
    direction={{
      xs: 'column',
      sm: 'row',
    }}
    justifyContent="space-between"
    alignItems={{
      xs: 'flex-start',
      sm: 'center',
    }}
    spacing={{
      xs: 0.5,
      sm: 2,
    }}
  >
    <Typography
      variant="body1"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: 0,
      }}
    >
      {offer.typeDisplayName ? offer.typeDisplayName : '不明'}
    </Typography>

    <Typography
      variant="body1"
      color="text.secondary"
      sx={{
        flexShrink: 0,
        textAlign: {
          xs: 'left',
          sm: 'right',
        },
      }}
    >
      発行日時: {getDate(offer.createDate)}
    </Typography>
  </Stack>

  <Stack
    direction={{
      xs: 'column',
      sm: 'row',
    }}
    justifyContent="space-between"
    alignItems={{
      xs: 'flex-start',
      sm: 'center',
    }}
    spacing={{
      xs: 0.5,
      sm: 2,
    }}
  >
    <Typography
      variant="body1"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: 0,
      }}
    >
      発行者:
      {offer.name ? (
        <EllipsisTooltip text={offer.name} maxChars={40} />
      ) : (
        '不明'
      )}
    </Typography>

    <Typography
      variant="body1"
      color="text.secondary"
      sx={{
        flexShrink: 0,
        textAlign: {
          xs: 'left',
          sm: 'right',
        },
      }}
    >
      発行期限:
      {offer.createDate
        ? offer.credentialOfferUrl
          ? getDate(offer.createDate + 5 * 60)
          : '無期限'
        : ''}
    </Typography>
  </Stack>
</Stack>
