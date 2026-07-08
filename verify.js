<Typography
  variant="body1"
  sx={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    minWidth: 0,
    whiteSpace: 'nowrap',
  }}
>
  <span style={{ flexShrink: 0 }}>発行者:</span>
  <span
    style={{
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {offer.name ? (
      <EllipsisTooltip text={offer.name} maxChars={40} />
    ) : (
      '不明'
    )}
  </span>
</Typography>
