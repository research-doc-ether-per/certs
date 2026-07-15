
const headerInfoTextSx = {
  maxWidth: {
    xs: '38%',
    sm: 220,
    md: 320,
  },
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

return (
  <>
    <Box
      component="header"
      sx={{
        borderBottom: '1px solid var(--mui-palette-divider)',
        backgroundColor: 'var(--mui-palette-background-paper)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--mui-zIndex-appBar)',
      }}
    >
      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={{
          xs: 1,
          sm: 2,
        }}
        sx={{
          alignItems: {
            xs: 'stretch',
            sm: 'center',
          },
          minHeight: {
            xs: 'auto',
            sm: '64px',
          },
          px: 2,
          py: {
            xs: 1,
            sm: 0,
          },
        }}
      >
        <Typography
          variant="h6"
          noWrap
          sx={{
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          {titles.header}
        </Typography>

        {/* PC / tablet 用：右側を押し出すための余白 */}
        <Box
          sx={{
            display: {
              xs: 'none',
              sm: 'block',
            },
            flexGrow: 1,
          }}
        />

        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            justifyContent: {
              xs: 'flex-end',
              sm: 'flex-start',
            },
            width: {
              xs: '100%',
              sm: 'auto',
            },
            minWidth: 0,
          }}
        >
          <Typography
            variant="subtitle1"
            noWrap
            sx={headerInfoTextSx}
          >
            {selectedGroupName || 'グループ未選択'}
          </Typography>

          <Typography
            variant="subtitle1"
            noWrap
            sx={headerInfoTextSx}
          >
            {userInfo?.preferred_username || 'Unknown User'}
          </Typography>

          <IconButton onClick={handleMenuOpen} aria-label="menu">
            <MenuIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Box>

    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
    >
      {/* MenuItem */}
    </Menu>
  </>
)
