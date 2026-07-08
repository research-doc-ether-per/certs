<StyledCard key={did.keyId} sx={{ height: '100%' }}>
  <StyledCardContent>
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        width: '100%',
        minWidth: 0,
      }}
    >
      {/* 左側：alias + DID。長い場合は EllipsisTooltip で省略表示する */}
      <Stack
        spacing={0.5}
        sx={{
          flex: '0 1 auto',
          minWidth: 0,
          maxWidth: '70%',
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

      {/* 右側：default + 詳細。左側情報の後ろに表示する */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          flexShrink: 0,
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
