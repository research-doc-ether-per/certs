<Grid item xl={6} lg={6} sm={6} xs={6}>
  {cert.hasDisclosures === true ? (
    <Stack
      direction={{
        xs: 'column',
        md: 'row',
      }}
      spacing={2}
      alignItems={{
        xs: 'stretch',
        md: 'flex-start',
      }}
      sx={{
        minHeight: '6rem',
        p: 2,
        height: '100%',
        width: '100%',
        minWidth: 0,
      }}
    >
      <Typography
        variant="subtitle2"
        fontWeight={600}
        sx={{
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        開示情報選択
      </Typography>

      <Stack
        spacing={1}
        sx={{
          flex: 1,
          minWidth: 0,
          width: '100%',
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
              alignItems="flex-start"
              spacing={1}
              sx={{
                width: '100%',
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
                sx={{
                  flexShrink: 0,
                  mt: '-4px',
                }}
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
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {claim[3]}
                </Typography>

                <Typography
                  component="div"
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
            </Stack>
          ))}
      </Stack>
    </Stack>
  ) : (
    <Box
      sx={{
        minHeight: '6rem',
        p: 2,
        height: '100%',
      }}
    />
  )}
</Grid>
