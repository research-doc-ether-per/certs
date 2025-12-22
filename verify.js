
import React from 'react'
import { Tooltip, Typography, Box } from '@mui/material'

export default function EllipsisTooltipMultiline(props) {
  const { text, maxCharsPerLine = 40, emptyText = '未設定' } = props

  const raw = text == null ? '' : String(text)
  const displayText = raw.length ? raw : emptyText

  const lines = displayText.split('\n')

  const hasEllipsis = lines.some((line) => line.length > maxCharsPerLine)

  const rendered = lines.map((line, idx) => {
    const short = line.length > maxCharsPerLine
      ? line.slice(0, maxCharsPerLine) + '…'
      : line
    return { idx, short }
  })

  const content = (
    <Typography
      variant="body1"
      color="text.secondary"
      sx={{
        whiteSpace: 'pre-line',
        wordBreak: 'break-word',
      }}
    >
      {rendered.map((item, i) => (
        <React.Fragment key={item.idx}>
          {item.short}
          {i !== rendered.length - 1 && '\n'}
        </React.Fragment>
      ))}
    </Typography>
  )

  if (!hasEllipsis) return content

  return (
    <Tooltip
      title={
        <Typography sx={{ whiteSpace: 'pre-line' }}>
          {displayText}
        </Typography>
      }
      arrow
    >
      <Box>{content}</Box>
    </Tooltip>
  )
}
