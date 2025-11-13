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

// 排序工具
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

// 列定义 + 固定宽度
const columns = [
  { id: 'userId',  label: '用户名',   width: 140 },
  { id: 'vcName',  label: '证书名',   width: 160 },
  { id: 'index',   label: 'Index',   width: 80  },
  { id: 'revoked', label: '有效状态', width: 100 },
];

export default function StatusListDetailDialog({
  open,
  onClose,
  vcType,         // 只需要从外面传 vcType
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // 画面状态
  const [order, setOrder] = React.useState('asc');
  const [orderBy, setOrderBy] = React.useState('userId');
  const [keyword, setKeyword] = React.useState('');
  const [onlyRevoked, setOnlyRevoked] = React.useState(false);

  // 数据状态：由 API 填充
  const [urls, setUrls] = React.useState([]);
  const [issuedAt, setIssuedAt] = React.useState('');
  const [vcTypeLabel, setVcTypeLabel] = React.useState('');
  const [targets, setTargets] = React.useState([]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // 打开对话框时，根据 vcType 调用 API 获取数据
  React.useEffect(() => {
    if (!open || !vcType) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/status-lists/detail?vcType=${encodeURIComponent(vcType)}`);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();

        // 根据你的实际 API 字段名在这里做映射
        setUrls(data.urls || data.statusListCredentialUrls || []);
        setIssuedAt(data.issuedAt || data.updateDate || data.createDate || '');
        setVcTypeLabel(data.vcType || data.type || vcType || '');
        setTargets(data.targets || data.rows || []);
      } catch (e) {
        console.error(e);
        setError('数据获取失败');
        setUrls([]);
        setIssuedAt('');
        setVcTypeLabel(vcType || '');
        setTargets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, vcType]);

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
        {/* 错误提示 */}
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error" variant="body2">{error}</Typography>
          </Box>
        )}

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
            <Typography variant="body1" sx={{ minHeight: 24 }}>{vcTypeLabel}</Typography>
          </Stack>
        </Stack>

        {/* 检索区 */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{ mb: 1.5 }}
          alignItems="center"
        >
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
        <TableContainer
          component={Paper}
          sx={{ minWidth: 680, border: '1px solid', borderColor: 'divider' }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              '& .MuiTableCell-root': {
                borderColor: 'divider',
                borderWidth: 1,
                borderStyle: 'solid',
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                backgroundColor: '#000',
                color: '#fff',
                borderColor: 'divider',
                borderWidth: 1,
                borderStyle: 'solid',
              },
            }}
          >
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell
                    key={col.id}
                    sortDirection={orderBy === col.id ? order : false}
                    sx={{
                      width: col.width,
                      maxWidth: col.width,
                      minWidth: col.width,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                      sx={{
                        color: '#fff',
                        '&.Mui-active': { color: '#fff' },
                        '& .MuiTableSortLabel-icon': { color: '#fff !important' },
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    无数据
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={`${r.userId}-${idx}`} hover>
                    <TableCell sx={{ width: columns[0].width }}>{r.userId}</TableCell>
                    <TableCell
                      sx={{ width: columns[1].width, color: 'error.main' }}
                    >
                      {r.vcName}
                    </TableCell>
                    <TableCell sx={{ width: columns[2].width }}>{r.index}</TableCell>
                    <TableCell sx={{ width: columns[3].width }}>
                      {String(r.revoked) === '1' ? '失效' : '有效'}
                    </TableCell>
                  </TableRow>
                ))
              )}
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
