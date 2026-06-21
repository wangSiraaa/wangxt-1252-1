import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import dayjs from 'dayjs'
import {
  getRefunds,
  getShows,
  approveRefund,
  rejectRefund,
} from '../api/services'
import { useToast } from '../components/ToastContext'
import {
  Refund,
  RefundStatus,
  RefundStatusLabels,
  Show,
} from '../types'

export default function RefundsPage() {
  const { showToast } = useToast()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState<string | number>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Refund | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (typeof showFilter === 'number') params.show_id = showFilter
      if (statusFilter) params.status = statusFilter
      const [refundData, showData] = await Promise.all([
        getRefunds(params),
        getShows(),
      ])
      let filtered = refundData
      if (search) {
        filtered = refundData.filter(
          (r) =>
            r.refund_no.toLowerCase().includes(search.toLowerCase()) ||
            (r.order_no || '').toLowerCase().includes(search.toLowerCase())
        )
      }
      setRefunds(filtered)
      setShows(showData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [showFilter, statusFilter, search])

  const handleApprove = async (id: number) => {
    if (!confirm('确定批准该退票申请吗？批准后座位将恢复为已退票状态。')) return
    try {
      const result = await approveRefund(id)
      setRefunds((prev) => prev.map((r) => (r.id === result.id ? result : r)))
      showToast('退票已批准完成', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '操作失败', 'error')
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('确定拒绝该退票申请吗？')) return
    try {
      const result = await rejectRefund(id)
      setRefunds((prev) => prev.map((r) => (r.id === result.id ? result : r)))
      showToast('退票已拒绝', 'info')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '操作失败', 'error')
    }
  }

  const getStatusColor = (status: RefundStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case RefundStatus.COMPLETED:
      case RefundStatus.APPROVED:
        return 'success'
      case RefundStatus.PENDING:
        return 'warning'
      case RefundStatus.REJECTED:
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>退票流水</Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            label="搜索退票号/订单号"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            label="场次筛选"
            select
            size="small"
            value={showFilter}
            onChange={(e) => setShowFilter(e.target.value)}
            sx={{ minWidth: 250 }}
          >
            <MenuItem value="">全部场次</MenuItem>
            {shows.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="状态筛选"
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">全部状态</MenuItem>
            {Object.entries(RefundStatusLabels).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <Button startIcon={<RefreshIcon />} onClick={loadData}>
            刷新
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>退票单号</TableCell>
                <TableCell>原订单号</TableCell>
                <TableCell>演出场次</TableCell>
                <TableCell align="right">退票金额</TableCell>
                <TableCell align="right">扣除手续费</TableCell>
                <TableCell align="right">实退金额</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>保留原单</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>申请时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ color: 'text.secondary' }}>
                    暂无退票记录
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((r) => {
                  const actualRefund = parseFloat(r.refund_amount) - parseFloat(r.service_fee_deducted)
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.refund_no}</TableCell>
                      <TableCell>{r.order_no}</TableCell>
                      <TableCell>{r.show_title}</TableCell>
                      <TableCell align="right">¥{r.refund_amount}</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        -¥{r.service_fee_deducted}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ¥{actualRefund.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.is_postponed_refund ? '延期退票' : '普通退票'}
                          size="small"
                          color={r.is_postponed_refund ? 'secondary' : 'default'}
                          variant={r.is_postponed_refund ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        {r.original_order_kept ? (
                          <Chip label="是" size="small" color="primary" variant="outlined" />
                        ) : (
                          <Chip label="否" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status_display || RefundStatusLabels[r.status]}
                          size="small"
                          color={getStatusColor(r.status)}
                        />
                      </TableCell>
                      <TableCell>{dayjs(r.created_at).format('MM-DD HH:mm')}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看详情">
                            <IconButton size="small" onClick={() => { setSelected(r); setDetailOpen(true) }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {r.status === RefundStatus.PENDING && (
                            <>
                              <Button
                                size="small"
                                startIcon={<CheckIcon />}
                                color="success"
                                variant="contained"
                                onClick={() => handleApprove(r.id)}
                              >
                                批准
                              </Button>
                              <Button
                                size="small"
                                startIcon={<CloseIcon />}
                                color="error"
                                onClick={() => handleReject(r.id)}
                              >
                                拒绝
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>退票详情</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">退票单号</Typography>
                <Typography variant="h6" fontWeight={700}>{selected.refund_no}</Typography>
              </Box>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Chip
                  label={selected.is_postponed_refund ? '延期场次退票' : '普通退票'}
                  color={selected.is_postponed_refund ? 'secondary' : 'default'}
                  variant={selected.is_postponed_refund ? 'filled' : 'outlined'}
                />
                {selected.original_order_kept && <Chip label="保留原订单" color="primary" variant="outlined" />}
                <Chip
                  label={selected.status_display || RefundStatusLabels[selected.status]}
                  color={getStatusColor(selected.status)}
                />
              </Stack>
              <Box>
                <Typography variant="caption" color="text.secondary">关联订单</Typography>
                <Typography variant="body1" fontWeight={600}>{selected.order_no}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">演出场次</Typography>
                <Typography variant="body1">{selected.show_title}</Typography>
              </Box>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">票面总额:</Typography>
                  <Typography variant="body2">¥{selected.refund_amount}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">手续费扣除:</Typography>
                  <Typography variant="body2" color="error">-¥{selected.service_fee_deducted}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={700}>实退金额:</Typography>
                  <Typography variant="h6" color="success.main" fontWeight={700}>
                    ¥{(parseFloat(selected.refund_amount) - parseFloat(selected.service_fee_deducted)).toFixed(2)}
                  </Typography>
                </Stack>
              </Paper>
              <Box>
                <Typography variant="caption" color="text.secondary">退票原因</Typography>
                <Typography variant="body2">{selected.refund_reason || '-'}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                申请时间: {dayjs(selected.created_at).format('YYYY-MM-DD HH:mm:ss')}
                {selected.completed_at && `\n完成时间: ${dayjs(selected.completed_at).format('YYYY-MM-DD HH:mm:ss')}`}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
          {selected?.status === RefundStatus.PENDING && (
            <>
              <Button color="error" onClick={() => { handleReject(selected.id); setDetailOpen(false) }}>
                拒绝
              </Button>
              <Button color="success" variant="contained" onClick={() => { handleApprove(selected.id); setDetailOpen(false) }}>
                批准
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
