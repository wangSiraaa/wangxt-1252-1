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
} from '@mui/material'
import { Check as CheckIcon, Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import dayjs from 'dayjs'
import {
  getInspections,
  updateInspection,
  getShows,
} from '../api/services'
import { useToast } from '../components/ToastContext'
import {
  EquipmentInspection,
  InspectionType,
  InspectionTypeLabels,
  InspectionStatus,
  InspectionStatusLabels,
  Show,
} from '../types'

export default function InspectionsPage() {
  const { showToast } = useToast()
  const [inspections, setInspections] = useState<EquipmentInspection[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState<string | number>('')
  const [typeFilter, setTypeFilter] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EquipmentInspection | null>(null)
  const [formData, setFormData] = useState({
    status: InspectionStatus.PENDING,
    remark: '',
    issues_found: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [inspectionData, showData] = await Promise.all([
        getInspections(typeof showFilter === 'number' ? showFilter : undefined, typeFilter || undefined),
        getShows(),
      ])
      setInspections(inspectionData)
      setShows(showData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [showFilter, typeFilter])

  const handleOpenEdit = (item: EquipmentInspection) => {
    setEditing(item)
    setFormData({
      status: item.status,
      remark: item.remark || '',
      issues_found: item.issues_found || '',
    })
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      const result = await updateInspection(editing.id, formData)
      setInspections((prev) => prev.map((i) => (i.id === result.id ? result : i)))
      showToast('保存成功', 'success')
      setEditDialogOpen(false)
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '保存失败', 'error')
    }
  }

  const quickUpdate = async (item: EquipmentInspection, status: InspectionStatus) => {
    try {
      const result = await updateInspection(item.id, {
        status,
        remark: status === InspectionStatus.PASS ? '检查通过' : '发现问题需整改',
        issues_found: status === InspectionStatus.FAIL ? '需要进一步排查' : '',
      })
      setInspections((prev) => prev.map((i) => (i.id === result.id ? result : i)))
      showToast(
        `${InspectionTypeLabels[item.inspection_type]}检查${InspectionStatusLabels[status]}`,
        status === InspectionStatus.PASS ? 'success' : 'warning'
      )
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '操作失败', 'error')
    }
  }

  const getStatusColor = (status: InspectionStatus): 'success' | 'error' | 'warning' => {
    switch (status) {
      case InspectionStatus.PASS:
        return 'success'
      case InspectionStatus.FAIL:
        return 'error'
      default:
        return 'warning'
    }
  }

  const getTypeColor = (type: InspectionType): 'error' | 'warning' | 'primary' => {
    switch (type) {
      case InspectionType.FIRE:
        return 'error'
      case InspectionType.LIGHTING:
        return 'warning'
      default:
        return 'primary'
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        设备安全检查
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
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
            label="检查类型"
            select
            size="small"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">全部类型</MenuItem>
            {Object.entries(InspectionTypeLabels).map(([k, v]) => (
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
                <TableCell>演出场次</TableCell>
                <TableCell>检查类型</TableCell>
                <TableCell>检查状态</TableCell>
                <TableCell>检查人员</TableCell>
                <TableCell>检查时间</TableCell>
                <TableCell>发现问题</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>
                    暂无检查记录（场次发布后自动创建检查项）
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.show_title || shows.find((s) => s.id === item.show)?.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.inspection_type_display || InspectionTypeLabels[item.inspection_type]}
                        color={getTypeColor(item.inspection_type)}
                        size="small"
                        variant={item.inspection_type === InspectionType.FIRE ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status_display || InspectionStatusLabels[item.status]}
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{item.inspector_name || '-'}</TableCell>
                    <TableCell>
                      {item.inspection_time ? dayjs(item.inspection_time).format('MM-DD HH:mm') : '-'}
                    </TableCell>
                    <TableCell>{item.issues_found || '-'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button
                          size="small"
                          startIcon={<CheckIcon />}
                          color="success"
                          variant={item.status === InspectionStatus.PASS ? 'contained' : 'outlined'}
                          onClick={() => quickUpdate(item, InspectionStatus.PASS)}
                        >
                          通过
                        </Button>
                        <Button
                          size="small"
                          startIcon={<CloseIcon />}
                          color="error"
                          variant={item.status === InspectionStatus.FAIL ? 'contained' : 'outlined'}
                          onClick={() => quickUpdate(item, InspectionStatus.FAIL)}
                        >
                          不通过
                        </Button>
                        <Button size="small" onClick={() => handleOpenEdit(item)}>
                          编辑
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          编辑检查记录
          {editing && (
            <Chip
              label={InspectionTypeLabels[editing.inspection_type]}
              size="small"
              sx={{ ml: 1 }}
              color={editing.inspection_type === InspectionType.FIRE ? 'error' : 'primary'}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="检查结果"
              select
              fullWidth
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as InspectionStatus })}
            >
              {Object.entries(InspectionStatusLabels).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="发现问题"
              fullWidth
              multiline
              rows={3}
              value={formData.issues_found}
              onChange={(e) => setFormData({ ...formData, issues_found: e.target.value })}
            />
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
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
