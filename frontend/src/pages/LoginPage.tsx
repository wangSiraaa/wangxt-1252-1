import { useState } from 'react'
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
} from '@mui/material'
import { login } from '../api/services'
import { useToast } from '../components/ToastContext'

interface LoginPageProps {
  onLoginSuccess: () => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      showToast('请输入用户名和密码', 'warning')
      return
    }
    setLoading(true)
    try {
      const data = await login(username, password)
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      showToast('登录成功', 'success')
      onLoginSuccess()
    } catch (err: any) {
      showToast(err?.response?.data?.detail || '登录失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 12 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" align="center" gutterBottom fontWeight={600}>
          剧院演出安全运营系统
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          请登录后继续操作
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            label="用户名"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" align="center">
            说明：请使用 Django 后台创建的用户登录
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}
