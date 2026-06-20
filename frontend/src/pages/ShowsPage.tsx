import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { DateTimePicker } from '@mui/x-date-pickers'
import dayjs, { Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  getShows,
  createShow,
  updateShow,
  deleteShow,
  publishShow,
  startSaleShow,
  stopSaleShow,
  postponeShow,
} from '../api/services'
import { useToast } from '../components/ToastContext'
import { Show, ShowStatus, ShowStatusLabels } from '../types'

export default function ShowsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    venue: '',
    description: '',
    total_capacity: 100,
    ticket_price: '100.00',
    service_fee_rate: '5.00',
    show_time: dayjs().add(1, 'day'),
  })

  const loadShows = async () => {
    setLoading(true)
    try {
      const data = await getShows({ search, status: statusFilter || undefined })
      setShows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShows()
  }, [search, statusFilter])

  const handleOpenCreate = () => {
    setEditingShow(null)
    setFormData({
      title: '',
      venue: '',
      description: '',
      total_capacity: 100,
      ticket_price: '100.00',
      service_fee_rate: '5.00',
      show_time: dayjs().add(1, 'day'),
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (show: Show) => {
    setEditingShow(show)
    setFormData({
      title: show.title,
      venue: show.venue,
      description: show.description || '',
      total_capacity: show.total_capacity,
      ticket_price: show.ticket_price,
      service_fee_rate: show.service_fee_rate,
      show_time: dayjs(show.show_time),
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.venue) {
      showToast('请填写演出名称和场地', 'warning')
      return
    }
    try {
      const payload = {
        ...formData,
        show_time: formData.show_time.toISOString(),
      }
      if (editingShow) {
        await updateShow(editingShow.id, payload)
        showToast('更新成功', 'success')
      } else {
        await createShow(payload)
        showToast('创建成功', 'success')
      }
      setDialogOpen(false)
      loadShows()
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '操作失败', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该场次吗？')) return
    try {
      await deleteShow(id)
      showToast('删除成功', 'success')
      loadShows()
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '删除失败', 'error')
    }
  }

  const handleAction = async (action: string, show: Show) => {
    try {
      let result: Show
      switch (action) {
        case 'publish':
          result = await publishShow(show.id)
          break
        case 'start':
          result = await startSaleShow(show.id)
          break
        case 'stop':
          result = await stopSaleShow(show.id)
          break
        case 'postpone':
          if (!confirm('确定将该场次标记为延期吗？')) return
          result = await postponeShow(show.id)
          break
        default:
          return
      }
      showToast('操作成功', 'success')
      setShows((prev) => prev.map((s) => (s.id === result.id ? result : s)))
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '操作失败', 'error')
    }
  }

  const getStatusColor = (status: ShowStatus) => {
    switch (status) {
      case ShowStatus.ON_SALE:
        return 'success'
      case ShowStatus.DRAFT:
        return 'default'
      case ShowStatus.PENDING_INSPECTION:
        return 'warning'
      case ShowStatus.READY:
        return 'info'
      case ShowStatus.INSPECTION_FAILED:
      case ShowStatus.CANCELLED:
        return 'error'
      case ShowStatus.POSTPONED:
        return 'secondary'
      case ShowStatus.COMPLETED:
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          场次管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          新增场次
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            label="搜索演出名称/场地"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 250 }}
          />
          <TextField
            label="状态筛选"
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">全部</MenuItem>
            {Object.entries(ShowStatusLabels).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <Button startIcon={<RefreshIcon />} onClick={loadShows}>
            刷新
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>演出名称</TableCell>
                <TableCell>场地</TableCell>
                <TableCell>演出时间</TableCell>
                <TableCell align="right">容量</TableCell>
                <TableCell align="right">已售</TableCell>
                <TableCell align="right">票价</TableCell>
                <TableCell>消防检查</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : shows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" color="text.secondary">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                shows.map((show) => (
                  <TableRow key={show.id} hover>
                    <TableCell>{show.title}</TableCell>
                    <TableCell>{show.venue}</TableCell>
                    <TableCell>{dayjs(show.show_time).format('YYYY-MM-DD HH:mm')}</TableCell>
                    <TableCell align="right">{show.total_capacity}</TableCell>
                    <TableCell align="right">
                      {show.sold_seats_count ?? 0}
                    </TableCell>
                    <TableCell align="right">¥{show.ticket_price}</TableCell>
                    <TableCell>
                      {show.is_fire_inspection_passed ? (
                        <Chip label="通过" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="未通过" size="small" color="error" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={show.status_display || ShowStatusLabels[show.status]}
                        size="small"
                        color={getStatusColor(show.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="详情">
                          <IconButton size="small" onClick={() => navigate(`/shows/${show.id}`)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {show.status === ShowStatus.DRAFT && (
                          <Tooltip title="编辑">
                            <IconButton size="small" onClick={() => handleOpenEdit(show)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {show.status === ShowStatus.DRAFT && (
                          <Tooltip title="删除">
                            <IconButton size="small" onClick={() => handleDelete(show.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {show.status === ShowStatus.DRAFT && (
                          <Button size="small" onClick={() => handleAction('publish', show)}>
                            发布
                          </Button>
                        )}
                        {show.status === ShowStatus.READY && (
                          <Button size="small" variant="contained" onClick={() => handleAction('start', show)}>
                            开售
                          </Button>
                        )}
                        {show.status === ShowStatus.ON_SALE && (
                          <Button size="small" onClick={() => handleAction('stop', show)}>
                            停售
                          </Button>
                        )}
                        {(show.status === ShowStatus.ON_SALE || show.status === ShowStatus.READY) && (
                          <Button size="small" color="secondary" onClick={() => handleAction('postpone', show)}>
                            延期
                          </Button>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingShow ? '编辑场次' : '新增场次'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="演出名称"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <TextField
              label="演出场地"
              fullWidth
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            />
            <DateTimePicker
              label="演出时间"
              value={formData.show_time}
              onChange={(val: Dayjs | null) => val && setFormData({ ...formData, show_time: val })}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <TextField
              label="座位容量"
              type="number"
              fullWidth
              value={formData.total_capacity}
              onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) || 0 })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="票价(元)"
                type="number"
                fullWidth
                value={formData.ticket_price}
                onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
              />
              <TextField
                label="手续费率(%)"
                type="number"
                fullWidth
                value={formData.service_fee_rate}
                onChange={(e) => setFormData({ ...formData, service_fee_rate: e.target.value })}
              />
            </Stack>
            <TextField
              label="演出描述"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
