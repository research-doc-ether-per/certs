
import {
  TextField,
  Typography,
} from '@mui/material'

const textFieldStyles = {
  '& .MuiInputBase-input': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}

const textAreaStyles = {
  '& .MuiInputBase-inputMultiline': {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
}

const requiredStyle = {
  color: '#d63384',
  paddingLeft: '3px',
}

/**
 * 入力項目のラベル
 *
 * @param {Object} props プロパティ
 * @returns {JSX.Element} ラベル
 */
export const TextFieldLabel = ({
  title,
  required = false,
  ...others
}) => (
  <Typography
    variant="subtitle1"
    color="text.secondary"
    gutterBottom
    {...others}
  >
    {title}

    {required ? (
      <span style={requiredStyle}>*</span>
    ) : null}
  </Typography>
)

/**
 * 1行入力用TextField
 *
 * @param {Object} props プロパティ
 * @returns {JSX.Element} TextField
 */
export const CustomTextField = ({
  value,
  sx,
  ...others
}) => (
  <TextField
    value={value ?? ''}
    fullWidth
    variant="outlined"
    {...others}
    sx={{
      ...textFieldStyles,
      ...sx,
    }}
  />
)

/**
 * 複数行入力用TextField
 *
 * @param {Object} props プロパティ
 * @returns {JSX.Element} TextArea
 */
export const CustomTextArea = ({
  value,
  minRows = 3,
  maxRows = 6,
  sx,
  ...others
}) => (
  <TextField
    value={value ?? ''}
    multiline
    minRows={minRows}
    maxRows={maxRows}
    fullWidth
    variant="outlined"
    {...others}
    sx={{
      ...textAreaStyles,
      ...sx,
    }}
  />
)
