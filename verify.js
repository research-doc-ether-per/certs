import PropTypes from 'prop-types'
import { Box, Tooltip, Typography } from '@mui/material'

/**
 * 省略表示付き Tooltip テキストコンポーネント
 *
 * 文字列が表示領域を超える場合は「...」で省略表示し、
 * hover 時に Tooltip で全文を表示する。
 *
 * 外側の Box は Chip 風表示用の固定スタイルとし、
 * Typography の props は呼び出し元から指定可能とする。
 *
 * @param {Object} props
 * コンポーネントの props
 *
 * @param {string} props.text
 * 表示対象の文字列。
 * 値が存在しない場合は「不明」を表示する。
 *
 * @param {Object} [props.sx]
 * Typography に適用する追加スタイル
 *
 * @param {Object} props.others
 * Typography に渡すその他の props
 *
 * @returns {JSX.Element}
 * 省略表示および Tooltip 表示に対応したテキストコンポーネント
 */
export default function EllipsisTooltipText({
  text,
  sx = {},
  ...others
}) {
  const value = text || '不明'

  return (
    <Tooltip title={value} arrow>
      <Box
        component="span"
        sx={{
          minWidth: 0,
          maxWidth: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '16px',
          px: 1.5,
          py: 0.5,
          bgcolor: 'grey.100',
          cursor: 'pointer',
        }}
      >
        <Typography
          component="span"
          variant="body2"
          {...others}
          sx={{
            minWidth: 0,
            maxWidth: '100%',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...sx,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Tooltip>
  )
}

EllipsisTooltipText.propTypes = {
  text: PropTypes.string,
  sx: PropTypes.object,
}
