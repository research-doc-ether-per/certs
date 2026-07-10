<StyledCardContent sx={{ minWidth: 0 }}>
  <EllipsisTooltipText
    text={item.name}
    variant="h6"
    fontWeight={600}
    gutterBottom
  />

  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    sx={{
      width: '100%',
      minWidth: 0,
    }}
  >
    <EllipsisTooltipText
      text={item.did}
      variant="body1"
      component="div"
      sx={{
        flex: 1,
        minWidth: 0,
      }}
    />

    <Tooltip title="コピー">
      <span>
        <IconButton
          size="small"
          disabled={!item.did}
          onClick={(event) => {
            event.stopPropagation()
            handleCopy(item.did)
          }}
              sx={{
    color: 'common.white',
    '&:hover': {
      color: 'common.white',
    },
    '&.Mui-disabled': {
      color: 'rgba(255, 255, 255, 0.4)',
    },
  }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  </Stack>
</StyledCardContent>
