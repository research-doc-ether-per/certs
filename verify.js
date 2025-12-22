import React from 'react'
import { Tooltip, Box, Typography } from '@mui/material'

export default function EllipsisTooltip({
  text,
  maxChars = 30,
  emptyText = '',
  sx = {},
}) {
  const raw =
    text === null || text === undefined || text === ''
      ? emptyText
      : String(text)

  if (!raw) {
    return (
      <Box component="span" sx={{ display: 'block', maxWidth: '100%', ...sx }}>
        {emptyText}
      </Box>
    )
  }

  const hasNewline = raw.includes('\n')

  // ===== 改行なし：単一行省略 =====
  if (!hasNewline) {
    const displayText =
      raw.length > maxChars ? `${raw.slice(0, maxChars)}…` : raw
    const needsTooltip = raw.length > maxChars

    const content = (
      <Box
        component="span"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          display: 'block',
          cursor: needsTooltip ? 'pointer' : 'inherit',
          ...sx,
        }}
      >
        {displayText}
      </Box>
    )

    return needsTooltip ? (
      <Tooltip
        arrow
        title={
          <Typography sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
            {raw}
          </Typography>
        }
      >
        {content}
      </Tooltip>
    ) : (
      content
    )
  }

  // ===== 改行あり：行ごとに省略 =====
  const lines = raw.split('\n')
  const truncatedLines = lines.map((line) =>
    line.length > maxChars ? `${line.slice(0, maxChars)}…` : line
  )
  const needsTooltip = lines.some((line) => line.length > maxChars)

  const content = (
    <Box
      component="span"
      sx={{
        display: 'block',
        maxWidth: '100%',
        cursor: needsTooltip ? 'pointer' : 'inherit',
        ...sx,
      }}
    >
      {truncatedLines.map((line, idx) => (
        <Box
          key={idx}
          component="span"
          sx={{
            display: 'block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {line === '' ? '\u00A0' : line}
        </Box>
      ))}
    </Box>
  )

  return needsTooltip ? (
    <Tooltip
      arrow
      title={
        <Typography sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
          {raw}
        </Typography>
      }
    >
      {content}
    </Tooltip>
  ) : (
    content
  )
}
