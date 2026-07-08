<Stack direction="row">
  <Radio
    checked={selectedOfferId === offer.docId}
    onChange={() => {
      setSelectedOfferId(offer.docId)
      setOfferUrl('')
    }}
    value={offer.docId}
    name="offer-radio"
  />

  <Stack
    spacing={1}
    sx={{
      flex: 1,
      minWidth: 0,
    }}
  >
    {/* 1行目：証明書名 */}
    <Typography variant="body1">
      {offer.certName ? (
        <EllipsisTooltip text={offer.certName} maxChars={40} />
      ) : (
        ''
      )}
    </Typography>

    {/* 2行目：種別 + 発行日時 */}
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
      sx={{
        width: '100%',
      }}
    >
      <Typography
        variant="body1"
        sx={{
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
          ml: {
            xs: 0,
            sm: 'auto',
          },
        }}
      >
        発行日時: {getDate(offer.createDate)}
      </Typography>
    </Stack>

    {/* 3行目：発行者 + 発行期限 */}
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
      sx={{
        width: '100%',
      }}
    >
      <Typography
        variant="body1"
        sx={{
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
          ml: {
            xs: 0,
            sm: 'auto',
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
</Stack>
