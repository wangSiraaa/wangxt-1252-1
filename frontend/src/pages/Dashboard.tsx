import { useState, useEffect } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material'
import {
  Theaters as ShowIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  ShoppingCart as OrderIcon,
  AssignmentReturn as RefundIcon,
  EventSeat as SeatIcon,
} from '@mui/icons-material'
import { getShows, getInspections, getOrders, getRefunds } from '../api/services'
import { ShowStatus, ShowStatusLabels, InspectionStatus } from '../types'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalShows: 0,
    onSaleShows: 0,
    pendingInspection: 0,
    totalOrders: 0,
    pendingRefunds: 0,
    totalSales: '0.00',
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [shows, inspections, orders, refunds] = await Promise.all([
          getShows(),
          getInspections(),
          getOrders(),
          getRefunds(),
        ])
        const onSale = shows.filter((s) => s.status === ShowStatus.ON_SALE).length
        const pendingInsp = inspections.filter((i) => i.status === InspectionStatus.PENDING).length
        const pendingRef = refunds.filter((r) => r.status === 'PENDING').length
        const totalSales = orders
          .filter((o) => o.status === 'PAID')
          .reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
          .toFixed(2)
        setStats({
          totalShows: shows.length,
          onSaleShows: onSale,
          pendingInspection: pendingInsp,
          totalOrders: orders.length,
          pendingRefunds: pendingRef,
          totalSales,
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  const statCards = [
    {
      title: '演出场次',
      value: stats.totalShows,
      subText: `在售: ${stats.onSaleShows}`,
      icon: <ShowIcon sx={{ fontSize: 40 }} />,
      color: 'primary',
    },
    {
      title: '待检查项',
      value: stats.pendingInspection,
      subText: '设备/安全检查',
      icon: <WarningIcon sx={{ fontSize: 40 }} />,
      color: 'warning',
    },
    {
      title: '订单总数',
      value: stats.totalOrders,
      subText: `销售额: ¥${stats.totalSales}`,
      icon: <OrderIcon sx={{ fontSize: 40 }} />,
      color: 'success',
    },
    {
      title: '待处理退票',
      value: stats.pendingRefunds,
      subText: '待审批退票单',
      icon: <RefundIcon sx={{ fontSize: 40 }} />,
      color: 'error',
    },
  ]

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        仪表盘
      </Typography>
      <Grid container spacing={3}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 700 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.subText}
                    </Typography>
                  </Box>
                  <Box color={`${card.color}.main`}>{card.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mt: 5, mb: 2, fontWeight: 600 }}>
        业务说明
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <CheckIcon color="success" />
                <Typography variant="subtitle1" fontWeight={600}>
                  安全检查流程
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                演出经理发布场次后，设备主管需完成以下检查：
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="吊杆检查" size="small" color="primary" variant="outlined" />
                <Chip label="灯光检查" size="small" color="primary" variant="outlined" />
                <Chip label="消防检查（必需）" size="small" color="error" />
              </Stack>
              <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                ⚠ 消防检查未通过，场次不能开售
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SeatIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  票务与退票规则
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                出票时校验座位容量，超过上限不可继续出票。
              </Typography>
              <Typography variant="body2" color="text.secondary">
                延期场次退票：保留原订单信息，按手续费规则扣除费用。
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
