// StatusListDetailDialog.jsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Box, Typography, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  TableSortLabel, Button, Tooltip, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// --- 排序工具 ---
function desc(a, b, key) {
  if (b[key] < a[key]) return -1;
  if (b[key] > a[key]) return 1;
  return 0;
}
function getComparator(order, key) {
  return order === 'desc'
    ? (a, b) => desc(a, b, key)
    : (a, b) => -desc(a, b, key);
}
function stableSort(arr, comparator) {
  const mapped = arr.map((el, i) => [el, i]);
  mapped.sort((a, b) => {
    const res = comparator(a[0], b[0]);
    return res !== 0 ? res : a[1] - b[1];
  });
  return mapped.map(el => el[0]);
}

export default function StatusListDetailDialog({
  open,
  onClose,
  urls = [],
  issuedAt = '',
  vcType = '',
  targets = [],
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [order, setOrder] = React.useState('asc');
  const [orderBy, setOrderBy] = React.useState('userId');
  const [keyword, setKeyword] = React.useState('');
  const [onlyRevoked, setOnlyRevoked] = React.useState(false);

  const handleSort = (key) => {
    const isAsc = orderBy === key && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(key);
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  // 过滤 + 排序
  const filtered = React.useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return targets.filter(r => {
      const hitKeyword = !k ||
        (String(r.userId || '').toLowerCase().includes(k)) ||
        (String(r.vcName || '').toLowerCase().includes(k));
      const hitRevoked = !onlyRevoked || String(r.revoked) === '1';
      return hitKeyword && hitRevoked;
    });
  }, [targets, keyword, onlyRevoked]);

  const rows = React.useMemo(
    () => stableSort(filtered, getComparator(order, orderBy)),
    [filtered, order, orderBy]
  );

  const labelSx = { width: 92, flex: '0 0 92px', whiteSpace: 'nowrap', color: 'text.secondary' };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          minWidth: { xs: '100%', sm: 480 },
          maxWidth: 900
        }
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        状态列表详情
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={(t) => ({ position: 'absolute', right: 8, top: 8, color: t.palette.grey[500] })}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          overflowY: 'auto',
          overflowX: 'auto',
          maxHeight: { xs: '75vh', sm: '70vh' }
        }}
      >
        {/* URL 列表 + 复制 */}
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {urls.map((u, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center" flexWrap="nowrap">
              <Typography variant="body2" sx={labelSx}>URL</Typography>
              <Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{u}</Typography>
              </Box>
              <Tooltip title="复制">
                <IconButton size="small" onClick={() => copy(u)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>

        {/* 元信息 */}
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={labelSx}>发行日時</Typography>
            <Typography variant="body1" sx={{ minHeight: 24 }}>{issuedAt}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={labelSx}>证书种别</Typography>
            <Typography variant="body1" sx={{ minHeight: 24 }}>{vcType}</Typography>
          </Stack>
        </Stack>

        {/* 检索区 */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 1.5 }} alignItems="center">
          <Box sx={{ display:'flex', alignItems:'center', flex: 1, minWidth: 220 }}>
            <Typography variant="body2" sx={labelSx}>对象者</Typography>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="按用户名、证书名检索"
              style={{ width:'100%', padding:'8px 10px', border:'1px solid #ccc', borderRadius:6 }}
            />
          </Box>
          <label style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input
              type="checkbox"
              checked={onlyRevoked}
              onChange={(e) => setOnlyRevoked(e.target.checked)}
            />
            仅显示失效
          </label>
        </Stack>

        {/* 表格 */}
        <TableContainer component={Paper} sx={{ minWidth: 680, border: '1px solid', borderColor: 'divider' }}>
          <Table size="small" stickyHeader
            sx={{
              '& .MuiTableCell-root': { borderColor: 'divider', borderWidth: 1, borderStyle: 'solid' },
              '& .MuiTableHead-root .MuiTableCell-root': {
                backgroundColor: '#000', color: '#fff',
                borderColor: 'divider', borderWidth: 1, borderStyle: 'solid'
              }
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  { id: 'userId', label: '用户名' },
                  { id: 'vcName', label: '证书名' },
                  { id: 'index', label: 'Index' },
                  { id: 'revoked', label: '有效状态' },
                ].map(col => (
                  <TableCell key={col.id} sortDirection={orderBy === col.id ? order : false}>
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                      sx={{
                        color: '#fff',
                        '&.Mui-active': { color: '#fff' },
                        '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={`${r.userId}-${idx}`} hover>
                  <TableCell>{r.userId}</TableCell>
                  <TableCell sx={{ color: 'error.main' }}>{r.vcName}</TableCell>
                  <TableCell>{r.index}</TableCell>
                  <TableCell>{String(r.revoked) === '1' ? '失效' : '有效'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center' }}>
        <Button onClick={onClose} variant="contained">关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
