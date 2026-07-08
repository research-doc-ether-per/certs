<Stack
  spacing={1}
  sx={{
    flex: 1,
    minHeight: '6rem',
    p: 2,
    height: '100%',
    minWidth: 0,
  }}
>
  {cert.disclosedClaims
    .filter(
      (claim) =>
        claim[3] !== undefined &&
        claim[3] !== null &&
        claim[3] !== '' &&
        claim[4] !== undefined &&
        claim[4] !== null &&
        claim[4] !== ''
    )
    .map((claim) => (
      <Stack
        key={claim[1]}
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          minWidth: 0,
        }}
      >
        <Checkbox
          checked={cert.selectedDisclosures.includes(claim[1])}
          onChange={(e) =>
            handleFieldSelection(
              cert.verificationCertId,
              claim[1],
              e.target.checked
            )
          }
          disabled={!selectedCertificateIds.includes(cert.verificationCertId)}
        />

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
              <EllipsisTooltipMultiline
                text={claim[4]}
                maxChars={20}
                emptyText="未設定"
              />
            )}
          </Typography>
        </Stack>
      </Stack>
    ))}
</Stack>
