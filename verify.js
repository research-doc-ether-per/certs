
<Stack
  key={claim.key}
  direction="row"
  spacing={={1}
  alignItems="flex-start"
>
  <span
    style={{
      display: 'inline-block',
      width: '1.5em',
      textAlign: 'center',
      color: claim.star ? 'red' : 'transparent',
      fontWeight: 'bold',
      marginTop: '2px',
    }}
  >
    {claim.star && (
      <Tooltip title="選択提示可能な情報" arrow>
        <StarIcon fontSize="small" />
      </Tooltip>
    )}
  </span>

  <Typography
    variant="body1"
    sx={{
      minWidth: '8em',  
      fontWeight: 500,
    }}
  >
    {claim.label}：
  </Typography>

  <Typography
    variant="body1"
    sx={{
      whiteSpace: 'pre-line',  
      wordBreak: 'break-word', 
      flex: 1,   
    }}
  >
    {claim.value || '不明'}
  </Typography>
</Stack>
