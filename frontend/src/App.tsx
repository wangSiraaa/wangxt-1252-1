import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ShowsPage from './pages/ShowsPage'
import ShowDetailPage from './pages/ShowDetailPage'
import InspectionsPage from './pages/InspectionsPage'
import OrdersPage from './pages/OrdersPage'
import RefundsPage from './pages/RefundsPage'
import LoginPage from './pages/LoginPage'
import { useState, useEffect } from 'react'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem('access_token')
  )

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout onLogout={handleLogout} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="shows" element={<ShowsPage />} />
        <Route path="shows/:id" element={<ShowDetailPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="refunds" element={<RefundsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
