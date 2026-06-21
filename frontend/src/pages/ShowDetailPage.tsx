import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import dayjs from 'dayjs'
import {
  getShow,
  getSeats,
  generateSeats,
  startSaleShow,
  stopSaleShow,
  postponeShow,
} from '../api/services'
import { useToast } from '../components/ToastContext'
import {
  Show,
  Seat,
  SeatStatus,
  SeatStatusLabels,
  ShowStatus,
  ShowStatusLabels,
  InspectionStatusLabels,
  InspectionType,
  InspectionTypeLabels,
  SeatZoneConfig,
} from '../types'

export default function ShowDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [show, setShow] = useState<Show | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [seatDialogOpen, setSeatDialogOpen] = useState(false)
  const [zones, setZones] = useState<SeatZoneConfig[]>([
    { zone: 'A区', prefix: 'A', count: 50, price: '100.00' },
  ])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [showData, seatsData] = await Promise.all([
        getShow(parseInt(id)),
        getSeats(parseInt(id)),
      ])
      setShow(showData)
      setSeats(seatsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleGenerateSeats = async () => {
    if (!id) return
    try {
      const data = await generateSeats(parseInt(id), zones)
      setSeats(data)
      showToast(`成功生成 ${data.length} 个座位`, 'success')
      setSeatDialogOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '生成座位失败', 'error')
    }
  }

  const handleAction = async (action: string) => {
    if (!id) return
    try {
      let result: Show
      switch (action) {
        case 'start':
          result = await startSaleShow(parseInt(id))
          break
        case 'stop':
          result = await stopSaleShow(parseInt(id))
          break
        case 'postpone':
          if (!confirm('确定将该场次标记为延期吗？')) return
          result = await postponeShow(parseInt(id))
          break
        default:
          return
      }
      setShow(result)
      showToast('操作成功', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '操作失败', 'error')
    }
  }

  const getSeatColor = (status: SeatStatus): 'success' | 'primary' | 'warning' | 'default' => {
    switch (status) {
      case SeatStatus.AVAILABLE:
        return 'success'
      case SeatStatus.SOLD:
        return 'primary'
      case SeatStatus.REFUNDED:
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusColor = (status: ShowStatus): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case ShowStatus.ON_SALE:
        return 'success'
      case ShowStatus.READY:
        return 'info'
      case ShowStatus.PENDING_INSPECTION:
        return 'warning'
      case ShowStatus.INSPECTION_FAILED:
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading || !show) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  const seatsByZone = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    const zone = seat.seat_zone || '默认区域'
    if (!acc[zone]) acc[zone] = []
    acc[zone].push(seat)
    return acc
  }, {})

  const soldCount = seats.filter((s) => s.status === SeatStatus.SOLD).length
  const availableCount = seats.filter((s) => s.status === SeatStatus.AVAILABLE).length
  const refundedCount = seats.filter((s) => s.status === SeatStatus.REFUNDED).length

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/shows')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600} sx={{ flexGrow: 1 }}>
          {show.title}
        </Typography>
        <Chip
          label={show.status_display || ShowStatusLabels[show.status]}
          color={getStatusColor(show.status)}
        />
        <Button startIcon={<RefreshIcon />} onClick={loadData} size="small">
          刷新
        </Button>
        {show.status === ShowStatus.READY && (
          <Button variant="contained" onClick={() => handleAction('start')}>
            开始售票
          </Button>
        )}
        {show.status === ShowStatus.ON_SALE && (
          <Button onClick={() => handleAction('stop')}>停止售票</Button>
        )}
        {(show.status === ShowStatus.ON_SALE || show.status === ShowStatus.READY) && (
          <Button color="secondary" onClick={() => handleAction('postpone')}>
            延期
          </Button>
        )}
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                场次信息
              </Typography>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">演出场地</Typography>
                  <Typography variant="body1">{show.venue}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">演出时间</Typography>
                  <Typography variant="body1">
                    {dayjs(show.show_time).format('YYYY年MM月DD日 HH:mm')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">票价</Typography>
                  <Typography variant="body1">¥{show.ticket_price}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">手续费率</Typography>
                  <Typography variant="body1">{show.service_fee_rate}%</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">座位容量</Typography>
                  <Typography variant="body1">{show.total_capacity} 座</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">销售统计</Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                    <Chip label={`已售 ${soldCount}`} color="primary" size="small" />
                    <Chip label={`可用 ${availableCount}`} color="success" size="small" variant="outlined" />
                    <Chip label={`退票 ${refundedCount}`} color="warning" size="small" variant="outlined" />
                  </Stack>
                </Box>
                {show.description && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">描述</Typography>
                      <Typography variant="body2">{show.description}</Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>座位管理</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setSeatDialogOpen(true)} size="small">
                  生成座位
                </Button>
              </Stack>

              {seats.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  暂无座位，请点击上方按钮生成
                </Box>
              ) : (
                <Stack spacing={2}>
                  {Object.entries(seatsByZone).map(([zone, zoneSeats]) => (
                    <Box key={zone}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>{zone}</Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {zoneSeats.map((seat) => (
                          <Tooltip
                            key={seat.id}
                            title={`${seat.seat_number} - ¥${seat.price} (${SeatStatusLabels[seat.status]})`}
                          >
                            <Chip
                              label={seat.seat_number}
                              size="small"
                              color={getSeatColor(seat.status)}
                              variant={seat.status === SeatStatus.AVAILABLE ? 'outlined' : 'filled'}
                              sx={{ mb: 0.5 }}
                            />
                          </Tooltip>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                  <Box>
                    <Typography variant="caption" color="text.secondary">图例：</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip label="可用" size="small" color="success" variant="outlined" />
                      <Chip label="已售" size="small" color="primary" />
                      <Chip label="已退票" size="small" color="warning" variant="outlined" />
                    </Stack>
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={seatDialogOpen} onClose={() => setSeatDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>生成座位配置</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              提示：点击下方"添加区域"可以配置多个票价区域
            </Typography>
            {zones.map((zone, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
                  <TextField
                    label="区域名称"
                    size="small"
                    value={zone.zone}
                    onChange={(e) => {
                      const next = [...zones]
                      next[idx].zone = e.target.value
                      setZones(next)
                    }}
                  />
                  <TextField
                    label="座位号前缀"
                    size="small"
                    value={zone.prefix}
                    onChange={(e) => {
                      const next = [...zones]
                      next[idx].prefix = e.target.value
                      setZones(next)
                    }}
                  />
                  <TextField
                    label="座位数量"
                    type="number"
                    size="small"
                    value={zone.count}
                    onChange={(e) => {
                      const next = [...zones]
                      next[idx].count = parseInt(e.target.value) || 0
                      setZones(next)
                    }}
                  />
                  <TextField
                    label="单价"
                    type="number"
                    size="small"
                    value={zone.price}
                    onChange={(e) => {
                      const next = [...zones]
                      next[idx].price = e.target.value
                      setZones(next)
                    }}
                  />
                  {zones.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setZones(zones.filter((_, i) => i !== idx))}
                    >
                      <CloseIcon />
                    </IconButton>
                  )}
                </Stack>
              </Paper>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => setZones([...zones, { zone: '', prefix: '', count: 0, price: show.ticket_price }])}
            >
              添加区域
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeatDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleGenerateSeats}>
            生成座位
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
