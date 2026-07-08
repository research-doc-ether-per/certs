<StyledCard key={did.keyId} sx={{ width: '100%' }}>
  <StyledCardContent
    sx={{
      p: 2,
      '&:last-child': {
        pb: 2,
      },
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        width: '100%',
        minWidth: 0,
      }}
    >
      {/* 左側：alias + DID */}
      <Stack
        spacing={0.5}
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <EllipsisTooltip text={did.alias} maxChars={60} />
        </Box>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <EllipsisTooltip text={did.did} maxChars={60} />
        </Typography>
      </Stack>

      {/* 右側：default + 詳細 */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          ml: 'auto',
          flexShrink: 0,
          alignSelf: 'center',
        }}
      >
        {did.default && (
          <Chip label="default" color="success" size="small" />
        )}

        <ActionButton
          variant="primary"
          size="small"
          onClick={() => handleShowDetail(did)}
        >
          詳細
        </ActionButton>
      </Stack>
    </Stack>
  </StyledCardContent>
</StyledCard>
