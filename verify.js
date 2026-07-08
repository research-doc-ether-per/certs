<Stack
  spacing={0.25}
  sx={{
    flex: 1,
    minWidth: 0,
  }}
>
  <Typography
    variant="body1"
    fontWeight={500}
    sx={{
      lineHeight: 1.4,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    }}
  >
    {claim[3]}
  </Typography>

  <Typography
    variant="body1"
    color="text.secondary"
    sx={{
      lineHeight: 1.4,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    }}
  >
    {claim[1] === 'image' ? (
      <img
        src={claim[4]}
        alt={claim[3] || 'disclosure'}
        style={{
          width: 60,
          minWidth: 60,
          height: Math.ceil((60 / 4) * 3),
          maxWidth: '100%',
        }}
      />
    ) : (
      claim[4] || '未設定'
    )}
  </Typography>
</Stack>
