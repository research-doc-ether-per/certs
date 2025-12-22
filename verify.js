import React from 'react'
import { Tooltip, Box } from '@mui/material'

export default function EllipsisTooltipMultiLine({
  text,
  maxChars = 30,
  emptyText = '未設定',
  sx = {},
}) {
  const rawText =
    typeof text === 'string' && text.length > 0 ? text : emptyText

  const hasNewLine = rawText.includes('\n')

  let displayText = rawText

  if (!hasNewLine) {
    // 改行なし：全体で判定
    if (rawText.length > maxChars) {
      displayText = rawText.slice(0, maxChars) + '…'
    }
  } else {
    // 改行あり：行ごとに判定
    const lines = rawText.split('\n')
    const displayLines = lines.map((line) => {
      if (line.length > maxChars) {
        return line.slice(0, maxChars) + '…'
      }
      return line
    })
    displayText = displayLines.join('\n')
  }

  return (
    <Tooltip title={rawText} arrow>
      <Box
        component="span"
        sx={{
          whiteSpace: 'pre-line', 
          wordBreak: 'break-word',
          maxWidth: '100%',
          display: 'block',
          cursor: 'pointer',
          ...sx,
        }}
      >
        {displayText}
      </Box>
    </Tooltip>
  )
}
