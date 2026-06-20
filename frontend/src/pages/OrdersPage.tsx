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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  ReceiptLong as ReceiptIcon,
  AssignmentReturn as RefundIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import dayjs from 'dayjs'
import {
  getOrders,
  getShows,
  getSeats,
  createOrder,
  createRefund,
} from '../api/services'
import { useToast } from '../components/ToastContext'
import {
  Order,
  OrderStatus,
  OrderStatusLabels,
  Show,
  Seat,
  SeatStatus,
} from '../types'

export default function OrdersPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [formData, setFormData] = useState({
    show_id: 0,
    customer_name: '',
    customer_phone: '',
    seat_ids: [] as number[],
    remark: '',
  })
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (showFilter) params.show_id = showFilter
      if (statusFilter) params.status = statusFilter
      const [orderData, showData] = await Promise.all([
        getOrders(params),
        getShows(),
      ])
      setOrders(orderData)
      setShows(showData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, showFilter, statusFilter])

  useEffect(() => {
    if (formData.show_id) {
      getSeats(formData.show_id, SeatStatus.AVAILABLE).then(setAvailableSeats)
    } else {
      setAvailableSeats([])
    }
  }, [formData.show_id])

  const handleOpenCreate = () => {
    setFormData({
      show_id: shows[0]?.id || 0,
      customer_name: '',
      customer_phone: '',
      seat_ids: [],
      remark: '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.show_id || !formData.customer_name || !formData.customer_phone) {
      showToast('请完整填写客户信息', 'warning')
      return
    }
    if (formData.seat_ids.length === 0) {
      showToast('请选择座位', 'warning')
      return
    }
    try {
      await createOrder(formData)
      showToast('出票成功', 'success')
      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '出票失败', 'error')
    }
  }

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  const handleQuickRefund = async (order: Order) => {
    if (!confirm(`确定为订单 ${order.order_no} 创建退票申请吗？`)) return
    try {
      await createRefund({
        order_id: order.id,
        refund_reason: '客户申请退票',
        is_postponed_refund: order.show_title?.includes('延期') || false,
      })
      showToast('退票申请已提交', 'success')
      loadData()
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '申请退票失败', 'error')
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID:
        return 'success'
      case OrderStatus.PENDING:
        return 'warning'
      case OrderStatus.REFUNDING:
        return 'info'
      case OrderStatus.REFUNDED:
        return 'default'
      default:
        return 'error'
    }
  }

  const toggleSeat = (seatId: number) => {
    setFormData((prev) => ({
      ...prev,
      seat_ids: prev.seat_ids.includes(seatId)
        ? prev.seat_ids.filter((id) => id !== seatId)
        : [...prev.seat_ids, seatId],
    }))
  }

  const selectedShow = shows.find((s) => s.id === formData.show_id)
  const selectedSeats = availableSeats.filter((s) => formData.seat_ids.includes(s.id))
  const totalAmount = selectedSeats.reduce((sum, s) => sum + parseFloat(s.price), 0)
  const serviceFee = selectedShow
    ? (totalAmount * parseFloat(selectedShow.service_fee_rate)) / 100
    : 0

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>票务订单</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          新增出票
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            label="搜索订单号/客户"
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
            {Object.entries(OrderStatusLabels).map(([k, v]) => (
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
                <TableCell>订单号</TableCell>
                <TableCell>演出场次</TableCell>
                <TableCell>客户姓名</TableCell>
                <TableCell>联系电话</TableCell>
                <TableCell align="right">座位数</TableCell>
                <TableCell align="right">总金额</TableCell>
                <TableCell align="right">手续费</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>下单时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" color="text.secondary">
                    暂无订单
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{order.order_no}</TableCell>
                    <TableCell>{order.show_title}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{order.customer_phone}</TableCell>
                    <TableCell align="right">{order.seat_count ?? order.items?.length ?? 0}</TableCell>
                    <TableCell align="right">¥{order.total_amount}</TableCell>
                    <TableCell align="right">¥{order.service_fee}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label={order.status_display || OrderStatusLabels[order.status]}
                          size="small"
                          color={getStatusColor(order.status) as any}
                        />
                        {order.is_postponed_refund && (
                          <Chip label="延期退票" size="small" color="secondary" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{dayjs(order.created_at).format('MM-DD HH:mm')}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => handleViewDetail(order)}>
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {order.status === OrderStatus.PAID && (
                          <Tooltip title="申请退票">
                            <Button size="small" color="warning" startIcon={<RefundIcon />} onClick={() => handleQuickRefund(order)}>
                              退票
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>新增出票</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="选择场次"
                  select
                  fullWidth
                  value={formData.show_id}
                  onChange={(e) => setFormData({ ...formData, show_id: parseInt(e.target.value), seat_ids: [] })}
                >
                  <MenuItem value={0}>请选择场次</MenuItem>
                  {shows
                    .filter((s) => ['ON_SALE', 'POSTPONED'].includes(s.status))
                    .map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.title} - ¥{s.ticket_price}
                        {!s.is_fire_inspection_passed && ' (消防未过)'}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="客户姓名"
                  fullWidth
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="联系电话"
                  fullWidth
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                />
              </Grid>
            </Grid>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  选择座位（已选 {formData.seat_ids.length} 个）
                </Typography>
                {selectedShow && (
                  <Typography variant="caption" color="text.secondary">
                    可用: {selectedShow.available_seats_count} / {selectedShow.total_capacity}
                  </Typography>
                )}
              </Stack>
              {availableSeats.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                  {formData.show_id ? '该场次暂无可售座位' : '请先选择场次'}
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 260, overflow: 'auto' }}>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {availableSeats.map((seat) => {
                      const selected = formData.seat_ids.includes(seat.id)
                      return (
                        <Chip
                          key={seat.id}
                          label={`${seat.seat_number} ¥${seat.price}`}
                          onClick={() => toggleSeat(seat.id)}
                          color={selected ? 'primary' : 'default'}
                          variant={selected ? 'filled' : 'outlined'}
                          sx={{ mb: 0.5, cursor: 'pointer' }}
                        />
                      )
                    })}
                  </Stack>
                </Paper>
              )}
            </Box>

            {formData.seat_ids.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" color="text.secondary">座位数</Typography>
                    <Typography variant="body1" fontWeight={600}>{formData.seat_ids.length} 座</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">票面总额</Typography>
                    <Typography variant="body1">¥{totalAmount.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">手续费 ({selectedShow?.service_fee_rate}%)</Typography>
                    <Typography variant="body1">¥{serviceFee.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">应收金额</Typography>
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      ¥{(totalAmount + serviceFee).toFixed(2)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            <TextField
              label="备注"
              fullWidth
              multiline
              rows={2}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>
            确认出票
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>订单详情</DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">订单号</Typography>
                <Typography variant="h6" fontWeight={700}>{selectedOrder.order_no}</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">演出场次</Typography>
                  <Typography variant="body1">{selectedOrder.show_title}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">状态</Typography>
                  <Chip
                    label={selectedOrder.status_display || OrderStatusLabels[selectedOrder.status]}
                    size="small"
                    color={getStatusColor(selectedOrder.status) as any}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">客户姓名</Typography>
                  <Typography variant="body1">{selectedOrder.customer_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">联系电话</Typography>
                  <Typography variant="body1">{selectedOrder.customer_phone}</Typography>
                </Grid>
              </Grid>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>座位明细</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {selectedOrder.items.map((item) => (
                        <Chip
                          key={item.id}
                          label={`${item.seat_number} ¥${item.price}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">票面总额:</Typography>
                <Typography variant="body2">¥{selectedOrder.total_amount}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">手续费:</Typography>
                <Typography variant="body2">¥{selectedOrder.service_fee}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700}>应收合计:</Typography>
                <Typography variant="h6" color="primary" fontWeight={700}>
                  ¥{(parseFloat(selectedOrder.total_amount) + parseFloat(selectedOrder.service_fee)).toFixed(2)}
                </Typography>
              </Stack>
              {selectedOrder.remark && (
                <Box>
                  <Typography variant="caption" color="text.secondary">备注</Typography>
                  <Typography variant="body2">{selectedOrder.remark}</Typography>
                </Box>
              )}
              <Typography variant="caption" color="text.secondary">
                创建于 {dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
          {selectedOrder?.status === OrderStatus.PAID && (
            <Button color="warning" startIcon={<RefundIcon />} onClick={() => { handleQuickRefund(selectedOrder); setDetailOpen(false) }}>
              申请退票
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
