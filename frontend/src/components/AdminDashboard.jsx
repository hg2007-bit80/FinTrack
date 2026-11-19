import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Users,
  Activity,
  ArrowLeftRight,
  Megaphone,
  Server,
  ShieldCheck,
  Settings,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Trash2,
  Eye,
  Send,
  RefreshCw,
  LogOut,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Cpu,
  Database,
  Lock,
  ChevronDown
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../services/api'
import {
  getAdminStats,
  getAdminAnalytics,
  getUsers,
  getUserDetails,
  updateUserStatus,
  deleteUser,
  broadcastNotification,
  getSystemInfo,
  getMaintenanceConfig,
  updateMaintenanceConfig,
  getAuditLogs,
  getActivityFeed
} from '../services/adminService'

const CHART_COLORS = ['#7657F6', '#3985F7', '#19BDA5', '#FFB547', '#F16B9B', '#6366f1']

function money(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN')
}

export default function AdminDashboard({ onExit, onLogout }) {
  const { user, login, logout, isAuthenticated } = useAuth()
  const { socket, isConnected } = useSocket()

  // Navigation
  const [activeTab, setActiveTab] = useState('Overview')

  // Auth check for admin
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [setupSuccess, setSetupSuccess] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [setupKey, setSetupKey] = useState('fintrack_admin_secret_2026')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  // 1. Overview state
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // 2. User Management state
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userTotalPages, setUserTotalPages] = useState(1)
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // 3. Live Activity state
  const [activities, setActivities] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  // 4. Transaction Monitoring state
  const [monitoredTxs, setMonitoredTxs] = useState([])

  // 5. Broadcast state
  const [broadcastTarget, setBroadcastTarget] = useState('all')
  const [broadcastTargetId, setBroadcastTargetId] = useState('')
  const [broadcastType, setBroadcastType] = useState('info')
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastStatus, setBroadcastStatus] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  // 6. System Monitoring state
  const [systemInfo, setSystemInfo] = useState(null)
  const [systemLoading, setSystemLoading] = useState(false)

  // 7. Audit Logs state
  const [auditLogs, setAuditLogs] = useState([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditLoading, setAuditLoading] = useState(false)

  // 8. Settings / Maintenance state
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [settingsStatus, setSettingsStatus] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Fetch Overview Stats & Analytics
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const [statsRes, analyticsRes] = await Promise.all([
        getAdminStats(),
        getAdminAnalytics()
      ])
      setStats(statsRes.stats)
      setAnalytics(analyticsRes.data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Fetch Users
  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      const res = await getUsers({
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
        page: userPage,
        limit: 10
      })
      setUsers(res.users || [])
      setUserTotalPages(res.pages || 1)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setUsersLoading(false)
    }
  }, [userSearch, userRoleFilter, userStatusFilter, userPage])

  // Fetch Activities
  const loadActivities = useCallback(async () => {
    try {
      setActivityLoading(true)
      const res = await getActivityFeed()
      setActivities(res.activities || [])
    } catch (err) {
      console.error('Failed to load activities:', err)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  // Fetch System Monitoring
  const loadSystemInfo = useCallback(async () => {
    try {
      setSystemLoading(true)
      const res = await getSystemInfo()
      setSystemInfo(res.system)
    } catch (err) {
      console.error('Failed to load system info:', err)
    } finally {
      setSystemLoading(false)
    }
  }, [])

  // Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true)
      const res = await getAuditLogs({ page: auditPage, limit: 15 })
      setAuditLogs(res.logs || [])
      setAuditTotalPages(res.pages || 1)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setAuditLoading(false)
    }
  }, [auditPage])

  // Fetch Maintenance settings
  const loadMaintenanceConfig = useCallback(async () => {
    try {
      const res = await getMaintenanceConfig()
      if (res.config) {
        setMaintenanceMode(Boolean(res.config.maintenanceMode))
        setMaintenanceMessage(res.config.maintenanceMessage || '')
      }
    } catch (err) {
      console.error('Failed to load maintenance config:', err)
    }
  }, [])

  // Initial load when admin is authenticated
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadStats()
      loadMaintenanceConfig()
    }
  }, [user, loadStats, loadMaintenanceConfig])

  // Tab change effect
  useEffect(() => {
    if (!user || user.role !== 'admin') return

    if (activeTab === 'User Management') loadUsers()
    if (activeTab === 'Live Activity' || activeTab === 'Socket.IO Monitoring') loadActivities()
    if (activeTab === 'System Monitoring') loadSystemInfo()
    if (activeTab === 'Audit Logs') loadAuditLogs()
  }, [activeTab, user, loadUsers, loadActivities, loadSystemInfo, loadAuditLogs])

  // Real-Time Socket.IO Listeners for Admin Dashboard
  useEffect(() => {
    if (!socket || !user || user.role !== 'admin') return

    // Real-Time Activity Feed updates
    const handleAdminActivity = (event) => {
      setActivities((prev) => [
        {
          id: Date.now(),
          type: event.type,
          description: event.description,
          user: event.user,
          timestamp: event.timestamp
        },
        ...prev.slice(0, 40)
      ])

      // Also trigger a light refresh of stats counters
      setStats((prev) => {
        if (!prev) return prev
        if (event.type === 'USER_REGISTERED') {
          return {
            ...prev,
            totalUsers: prev.totalUsers + 1,
            newUsersToday: prev.newUsersToday + 1
          }
        }
        return prev
      })
    }

    // Real-Time Transaction Monitoring
    const handleAdminTx = (txEvent) => {
      setMonitoredTxs((prev) => [
        {
          id: txEvent.transactionId || Date.now(),
          action: txEvent.action,
          user: txEvent.user,
          title: txEvent.title,
          type: txEvent.type,
          amount: txEvent.amount,
          category: txEvent.category,
          timestamp: txEvent.timestamp
        },
        ...prev.slice(0, 50)
      ])

      // Increment stats in real time
      setStats((prev) => {
        if (!prev) return prev
        if (txEvent.action === 'created') {
          return {
            ...prev,
            totalTransactions: prev.totalTransactions + 1,
            transactionsToday: prev.transactionsToday + 1,
            totalIncome:
              txEvent.type === 'income' ? prev.totalIncome + txEvent.amount : prev.totalIncome,
            totalExpenses:
              txEvent.type === 'expense' ? prev.totalExpenses + txEvent.amount : prev.totalExpenses
          }
        }
        return prev
      })
    }

    // Live User Presence updates
    const handleUserOnline = (data) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === data.user.id ? { ...u, isOnline: true } : u))
      )
    }

    const handleUserOffline = (data) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === data.userId ? { ...u, isOnline: false } : u))
      )
    }

    // Presence count updates
    const handlePresenceCount = (counts) => {
      setStats((prev) => (prev ? { ...prev, onlineUsersCount: counts.onlineUsers } : prev))
    }

    socket.on('admin:activity', handleAdminActivity)
    socket.on('admin:transaction', handleAdminTx)
    socket.on('presence:user_online', handleUserOnline)
    socket.on('presence:user_offline', handleUserOffline)
    socket.on('presence:count', handlePresenceCount)

    return () => {
      socket.off('admin:activity', handleAdminActivity)
      socket.off('admin:transaction', handleAdminTx)
      socket.off('presence:user_online', handleUserOnline)
      socket.off('presence:user_offline', handleUserOffline)
      socket.off('presence:count', handlePresenceCount)
    }
  }, [socket, user])

  // Handle Admin Login submission
  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setSetupSuccess('')
    setIsLoggingIn(true)
    try {
      const res = await login(adminEmail, adminPassword)
      if (res.user.role !== 'admin') {
        setAuthError('Access denied: You do not have administrator permissions.')
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid email or password')
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Handle Admin Setup / Password Reset
  const handleAdminSetup = async (e) => {
    e.preventDefault()
    setAuthError('')
    setSetupSuccess('')
    setIsLoggingIn(true)
    try {
      await api.post('/auth/setup-admin', {
        email: adminEmail.trim(),
        password: adminPassword,
        secretKey: setupKey.trim()
      })
      setSetupSuccess('Admin account configured successfully! Signing in...')
      await login(adminEmail.trim(), adminPassword)
    } catch (err) {
      setAuthError(err.response?.data?.message || err.message || 'Setup failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Handle User Status toggle (Activate / Deactivate)
  const handleToggleUserStatus = async (targetUser) => {
    const nextStatus = !targetUser.isActive
    const verb = nextStatus ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${verb} user "${targetUser.name}"?`)) return

    try {
      await updateUserStatus(targetUser._id, nextStatus)
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, isActive: nextStatus } : u))
      )
      if (selectedUser && selectedUser._id === targetUser._id) {
        setSelectedUser((prev) => ({ ...prev, isActive: nextStatus }))
      }
    } catch (err) {
      alert(err.message || `Failed to ${verb} user`)
    }
  }

  // Handle User Deletion
  const handleDeleteUser = async (targetUser) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete user "${targetUser.name}" (${targetUser.email})? This action cannot be undone.`
      )
    )
      return

    try {
      await deleteUser(targetUser._id)
      setUsers((prev) => prev.filter((u) => u._id !== targetUser._id))
      setDetailsModalOpen(false)
    } catch (err) {
      alert(err.message || 'Failed to delete user')
    }
  }

  // Open user details modal
  const handleViewUser = async (userId) => {
    try {
      const res = await getUserDetails(userId)
      setSelectedUser(res.user)
      setDetailsModalOpen(true)
    } catch (err) {
      alert('Could not fetch user details: ' + err.message)
    }
  }

  // Handle Broadcast Notification Submit
  const handleSendBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return

    setIsBroadcasting(true)
    setBroadcastStatus('')
    try {
      await broadcastNotification({
        target: broadcastTarget,
        targetId: broadcastTarget === 'user' ? broadcastTargetId : null,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType
      })
      setBroadcastStatus('Broadcast successfully sent via Socket.IO!')
      setBroadcastTitle('')
      setBroadcastMessage('')
    } catch (err) {
      setBroadcastStatus('Error: ' + (err.message || 'Failed to send broadcast'))
    } finally {
      setIsBroadcasting(false)
    }
  }

  // Handle Maintenance Mode Save
  const handleSaveMaintenance = async (e) => {
    e.preventDefault()
    setIsSavingSettings(true)
    setSettingsStatus('')
    try {
      await updateMaintenanceConfig({
        maintenanceMode,
        maintenanceMessage: maintenanceMessage.trim()
      })
      setSettingsStatus('Maintenance mode settings updated and broadcasted live!')
    } catch (err) {
      setSettingsStatus('Error: ' + (err.message || 'Failed to update settings'))
    } finally {
      setIsSavingSettings(false)
    }
  }

  // --------------------------------------------------------------------------
  // RENDER: Unauthenticated or Non-Admin state
  // --------------------------------------------------------------------------
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-[#7657F6]">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-bold text-[#20243A]">FinTrack Admin Portal</h2>
            <p className="mt-1 text-xs text-gray-500">
              Restricted area. Please authenticate with administrator credentials.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="mb-4 flex rounded-xl bg-gray-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setAuthError('')
                setSetupSuccess('')
              }}
              className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                authMode === 'login'
                  ? 'bg-white text-[#7657F6] shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Admin Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('setup')
                setAuthError('')
                setSetupSuccess('')
              }}
              className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                authMode === 'setup'
                  ? 'bg-white text-[#7657F6] shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Setup / Set Password
            </button>
          </div>

          {authError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {setupSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{setupSuccess}</span>
            </div>
          )}

          {isAuthenticated && user?.role !== 'admin' ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
                You are currently logged in as <strong>{user.email}</strong>, which does not have
                administrative privileges.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onExit}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Return to FinTrack
                </button>
                <button
                  onClick={logout}
                  className="flex-1 rounded-xl bg-[#7657F6] py-2.5 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  Log Out & Switch User
                </button>
              </div>
            </div>
          ) : authMode === 'login' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Admin Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@fintrack.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7657F6]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7657F6]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full rounded-xl bg-[#7657F6] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-100 hover:bg-purple-700 disabled:opacity-60 transition"
              >
                {isLoggingIn ? 'Authenticating...' : 'Sign In as Administrator'}
              </button>

              <button
                type="button"
                onClick={onExit}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
              >
                ← Back to Login / Portal Selection
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSetup} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Target Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="parth@gmail.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7657F6]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  New Admin Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="•••••••• (min 6 characters)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7657F6]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Admin Setup Secret Key
                </label>
                <input
                  type="text"
                  required
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  placeholder="fintrack_admin_secret_2026"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7657F6]"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Default key: <code className="bg-gray-100 px-1 py-0.5 rounded">fintrack_admin_secret_2026</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full rounded-xl bg-[#7657F6] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-100 hover:bg-purple-700 disabled:opacity-60 transition"
              >
                {isLoggingIn ? 'Configuring...' : 'Set Admin Password & Sign In'}
              </button>

              <button
                type="button"
                onClick={onExit}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
              >
                ← Back to Login / Portal Selection
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // RENDER: Full SaaS Admin Dashboard
  // --------------------------------------------------------------------------
  const navItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'User Management', icon: Users },
    { name: 'Live Activity', icon: Activity },
    { name: 'Transaction Monitoring', icon: ArrowLeftRight },
    { name: 'Real-Time Notifications', icon: Megaphone },
    { name: 'Socket.IO Monitoring', icon: Radio },
    { name: 'System Monitoring', icon: Server },
    { name: 'Audit Logs', icon: ShieldCheck },
    { name: 'Settings', icon: Settings }
  ]

  return (
    <div className="flex min-h-screen bg-[#F7F8FC] text-[#20243A]">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-100 bg-white p-5 flex flex-col justify-between">
        <div>
          {/* Logo & Tag */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#7657F6]">
                FinTrack<span className="text-gray-800">.</span>
              </h1>
              <span className="inline-block rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#7657F6] uppercase">
                Admin Panel
              </span>
            </div>

            {/* Live Socket badge */}
            <div
              title={isConnected ? 'Socket.IO Admin Stream Active' : 'Connecting Real-Time'}
              className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              {isConnected ? 'Live' : 'Off'}
            </div>
          </div>

          {/* Navigation Menu */}
          <p className="mt-8 mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Administration
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.name
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#7657F6] text-white shadow-md shadow-purple-100'
                      : 'text-gray-500 hover:bg-purple-50 hover:text-[#7657F6]'
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Admin User info & Exit */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7657F6] text-xs font-bold text-white uppercase">
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-gray-800">{user?.name}</p>
              <p className="truncate text-[10px] text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={async () => { await logout() }}
              title="Log Out"
              className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-white transition"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Top Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Control Panel</span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-semibold text-[#7657F6]">{activeTab}</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-[#20243A]">{activeTab}</h2>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-sm">
              <Radio size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-gray-500">
                Online: <strong className="text-gray-800">{stats?.onlineUsersCount ?? 0}</strong>
              </span>
            </div>

            <button
              onClick={() => {
                if (activeTab === 'Overview') loadStats()
                if (activeTab === 'User Management') loadUsers()
                if (activeTab === 'Live Activity' || activeTab === 'Socket.IO Monitoring') loadActivities()
                if (activeTab === 'System Monitoring') loadSystemInfo()
                if (activeTab === 'Audit Logs') loadAuditLogs()
              }}
              title="Refresh Current View"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:border-[#7657F6] hover:text-[#7657F6] transition"
            >
              <RefreshCw size={13} /> Refresh
            </button>

            {/* Admin Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setAdminMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:border-[#7657F6] transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7657F6] text-xs font-bold text-white uppercase">
                  {user?.name ? user.name[0] : 'A'}
                </div>
                <span className="hidden sm:inline font-medium text-gray-800">{user?.name}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {adminMenuOpen && (
                <div
                  className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl animate-fade-in"
                  onMouseLeave={() => setAdminMenuOpen(false)}
                >
                  <div className="border-b border-gray-100 px-3 py-2.5">
                    <p className="truncate text-xs font-bold text-gray-800">{user?.name}</p>
                    <p className="truncate text-[10px] text-gray-400">{user?.email}</p>
                    <span className="mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-[#7657F6] uppercase">
                      Administrator
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setAdminMenuOpen(false)
                        setActiveTab('Settings')
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Settings size={14} /> System Settings
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={async () => {
                        setAdminMenuOpen(false)
                        await logout()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {statsLoading && !stats ? (
              <p className="text-xs text-gray-400 animate-pulse">
                Loading real-time MongoDB statistics...
              </p>
            ) : (
              <>
                {/* 8 Real-time Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: 'Total Registered Users',
                      val: stats?.totalUsers ?? 0,
                      sub: `+${stats?.newUsersToday ?? 0} today`,
                      color: 'bg-purple-100 text-purple-600',
                      icon: Users
                    },
                    {
                      label: 'Active Users (DB)',
                      val: stats?.activeUsersCount ?? 0,
                      sub: 'Active accounts',
                      color: 'bg-blue-100 text-blue-600',
                      icon: CheckCircle2
                    },
                    {
                      label: 'Online Users (Socket.IO)',
                      val: stats?.onlineUsersCount ?? 0,
                      sub: 'Currently connected',
                      color: 'bg-emerald-100 text-emerald-600',
                      icon: Radio
                    },
                    {
                      label: 'Active Sockets',
                      val: stats?.activeSockets ?? 0,
                      sub: 'Connected client sockets',
                      color: 'bg-teal-100 text-teal-600',
                      icon: Server
                    },
                    {
                      label: 'Total Transactions',
                      val: stats?.totalTransactions ?? 0,
                      sub: `+${stats?.transactionsToday ?? 0} today`,
                      color: 'bg-amber-100 text-amber-600',
                      icon: ArrowLeftRight
                    },
                    {
                      label: 'Total Recorded Income',
                      val: money(stats?.totalIncome ?? 0),
                      sub: 'System-wide sum',
                      color: 'bg-indigo-100 text-indigo-600',
                      icon: TrendingUp
                    },
                    {
                      label: 'Total Recorded Expenses',
                      val: money(stats?.totalExpenses ?? 0),
                      sub: 'System-wide sum',
                      color: 'bg-pink-100 text-pink-600',
                      icon: TrendingDown
                    },
                    {
                      label: 'Net Balance Tracked',
                      val: money(stats?.netBalance ?? 0),
                      sub: 'Income minus expenses',
                      color: 'bg-cyan-100 text-cyan-600',
                      icon: DollarSign
                    }
                  ].map((card, i) => {
                    const Icon = card.icon
                    return (
                      <div
                        key={i}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">{card.label}</p>
                          <span className={`rounded-xl p-2 ${card.color}`}>
                            <Icon size={16} />
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-[#20243A]">{card.val}</h3>
                        <p className="mt-1 text-[11px] text-gray-400">{card.sub}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Interactive Charts */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  {/* Daily Activity Chart */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
                    <div className="mb-4">
                      <h4 className="font-bold text-[#20243A]">Daily Transaction Activity</h4>
                      <p className="text-xs text-gray-400">
                        Income vs Expenses over the past 7 days (Actual Database Data)
                      </p>
                    </div>

                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.dailyTrends || []} barGap={6}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeef5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `₹${v / 1000}k`}
                          />
                          <Tooltip formatter={(v) => money(v)} />
                          <Bar
                            dataKey="income"
                            name="Income"
                            fill="#7657F6"
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="expenses"
                            name="Expenses"
                            fill="#19BDA5"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* System Expense Categories Breakdown */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4">
                      <h4 className="font-bold text-[#20243A]">Expense Breakdown</h4>
                      <p className="text-xs text-gray-400">Spending across all categories</p>
                    </div>

                    {!analytics?.categoryBreakdown?.length ? (
                      <p className="py-20 text-center text-xs text-gray-400">
                        No expense records in database yet.
                      </p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.categoryBreakdown}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={4}
                            >
                              {analytics.categoryBreakdown.map((_, index) => (
                                <Cell
                                  key={index}
                                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => money(v)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'User Management' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setUserPage(1)
                  }}
                  className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-[#7657F6]"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value)
                  setUserPage(1)
                }}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#7657F6]"
              >
                <option value="">All Roles</option>
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value)
                  setUserPage(1)
                }}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#7657F6]"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Presence</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Loading registered users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No users matched your search criteria.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = user?._id === u._id
                        return (
                          <tr key={u._id} className="hover:bg-gray-50/50 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-[#7657F6] uppercase">
                                  {u.name ? u.name[0] : 'U'}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {u.name} {isSelf && '(You)'}
                                  </p>
                                  <p className="text-[11px] text-gray-400">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-[#7657F6]'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  u.isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <CheckCircle2 size={10} /> Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={10} /> Deactivated
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                                  }`}
                                />
                                <span className={u.isOnline ? 'text-emerald-700' : 'text-gray-400'}>
                                  {u.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500">
                              {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewUser(u._id)}
                                  title="View User Details"
                                  className="rounded-lg p-1.5 text-gray-400 hover:bg-purple-50 hover:text-[#7657F6] transition"
                                >
                                  <Eye size={15} />
                                </button>

                                {!isSelf && (
                                  <>
                                    <button
                                      onClick={() => handleToggleUserStatus(u)}
                                      title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                                      className={`rounded-lg p-1.5 transition ${
                                        u.isActive
                                          ? 'text-amber-500 hover:bg-amber-50'
                                          : 'text-emerald-500 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {u.isActive ? (
                                        <XCircle size={15} />
                                      ) : (
                                        <CheckCircle2 size={15} />
                                      )}
                                    </button>

                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      title="Delete Account Permanently"
                                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {userTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                  <span>
                    Page {userPage} of {userTotalPages}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={userPage >= userTotalPages}
                      onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE ACTIVITY */}
        {activeTab === 'Live Activity' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#20243A]">Live Activity Feed</h4>
                <p className="text-xs text-gray-400">
                  Real-time events pushed directly over Socket.IO without polling
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
              </span>
            </div>

            {activityLoading && activities.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">Loading activities...</p>
            ) : activities.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">No activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {activities.map((item) => (
                  <div key={item.id} className="py-3 flex items-start gap-3 text-xs">
                    <div className="mt-0.5 rounded-full bg-purple-50 p-1.5 text-[#7657F6]">
                      <Activity size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.description}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {item.user ? `${item.user.name} (${item.user.email}) · ` : ''}
                        {new Date(item.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 uppercase">
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRANSACTION MONITORING */}
        {activeTab === 'Transaction Monitoring' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#20243A]">Real-Time Transaction Stream</h4>
                <p className="text-xs text-gray-400">
                  Instant visibility into transaction events created, updated, or deleted
                </p>
              </div>
              <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-[#7657F6]">
                {monitoredTxs.length} Captured Events
              </span>
            </div>

            {monitoredTxs.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                <ArrowLeftRight size={32} className="mx-auto mb-2 text-gray-300" />
                <p>Waiting for live transaction events across connected clients...</p>
                <p className="mt-1 text-[11px] text-gray-300">
                  Create or update a transaction in another tab to observe immediate push updates.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {monitoredTxs.map((t) => (
                  <div
                    key={t.id + t.action}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                          t.action === 'created'
                            ? 'bg-emerald-50 text-emerald-700'
                            : t.action === 'updated'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {t.action}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-800">{t.title}</p>
                        <p className="text-[11px] text-gray-400">
                          By: {t.user?.name || 'Anonymous'} ({t.user?.email || 'N/A'}) ·{' '}
                          {t.category}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          t.type === 'income' ? 'text-teal-600' : 'text-gray-800'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {money(t.amount)}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(t.timestamp).toLocaleTimeString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REAL-TIME NOTIFICATIONS */}
        {activeTab === 'Real-Time Notifications' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="font-bold text-[#20243A] flex items-center gap-2">
                <Megaphone size={18} className="text-[#7657F6]" /> Admin Broadcast Composer
              </h4>
              <p className="mt-1 text-xs text-gray-400">
                Send real-time alerts directly into user interfaces via Socket.IO
              </p>

              {broadcastStatus && (
                <div
                  className={`mt-4 rounded-xl p-3 text-xs ${
                    broadcastStatus.startsWith('Error')
                      ? 'border border-red-200 bg-red-50 text-red-700'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {broadcastStatus}
                </div>
              )}

              <form onSubmit={handleSendBroadcast} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Recipient Target
                  </label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#7657F6]"
                  >
                    <option value="all">All Connected Users (System-wide)</option>
                    <option value="user">Specific User by ID</option>
                  </select>
                </div>

                {broadcastTarget === 'user' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Target User MongoDB ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 660f1b2c3d4e5f6a7b8c9d0e"
                      value={broadcastTargetId}
                      onChange={(e) => setBroadcastTargetId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#7657F6]"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Alert Severity
                  </label>
                  <div className="flex gap-2">
                    {['info', 'warning', 'alert'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBroadcastType(t)}
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition ${
                          broadcastType === t
                            ? t === 'info'
                              ? 'bg-blue-600 text-white'
                              : t === 'warning'
                              ? 'bg-amber-500 text-white'
                              : 'bg-red-600 text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled System Maintenance"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#7657F6]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Message</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide details about the announcement..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#7657F6]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7657F6] py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-100 hover:bg-purple-700 transition disabled:opacity-60"
                >
                  <Send size={14} />
                  {isBroadcasting ? 'Broadcasting via Socket.IO...' : 'Dispatch Broadcast Now'}
                </button>
              </form>
            </div>

            {/* Live Client Preview */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="font-bold text-[#20243A]">Live Client Preview</h4>
              <p className="mt-1 text-xs text-gray-400">
                Visual preview of how the toast will appear in users' viewports
              </p>

              <div className="mt-6">
                <div
                  className={`rounded-2xl border p-4 shadow-lg ${
                    broadcastType === 'alert'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : broadcastType === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-blue-200 bg-blue-50 text-blue-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-sm">
                        {broadcastTitle || 'Announcement Title'}
                      </p>
                      <p className="mt-1 text-xs opacity-90">
                        {broadcastMessage || 'Announcement description will be displayed here in full.'}
                      </p>
                      <p className="mt-2 text-[10px] opacity-60">
                        From: {user.name} · Just now
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SOCKET.IO MONITORING */}
        {activeTab === 'Socket.IO Monitoring' && (
          <div className="space-y-6">
            {/* Live Connection Overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: 'Server Connection',
                  val: isConnected ? 'Online' : 'Offline',
                  sub: isConnected ? 'Real-time stream active' : 'Reconnecting...',
                  color: isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500',
                  icon: Radio
                },
                {
                  label: 'Online Users',
                  val: stats?.onlineUsersCount ?? 0,
                  sub: 'Currently connected',
                  color: 'bg-purple-100 text-purple-600',
                  icon: Users
                },
                {
                  label: 'Total Users',
                  val: stats?.totalUsers ?? 0,
                  sub: 'Registered accounts',
                  color: 'bg-blue-100 text-blue-600',
                  icon: Users
                },
                {
                  label: 'Socket Rooms',
                  val: 'admin + user:*',
                  sub: 'Role-separated channels',
                  color: 'bg-teal-100 text-teal-600',
                  icon: Server
                }
              ].map(({ label, val, sub, color, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500">{label}</p>
                    <span className={`rounded-lg p-2 ${color}`}><Icon size={16} /></span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-[#20243A]">{val}</p>
                  <p className="mt-1 text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Socket Architecture */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#20243A] mb-4">Socket.IO Architecture</h3>
              <div className="space-y-3 text-sm">
                {[
                  { room: 'admin', desc: 'Admin-only room — receives all system events, activity feed, transaction monitoring, presence counts', badge: 'Admin' },
                  { room: 'user:<id>', desc: 'Per-user private room — budget alerts, deactivation notices, personal broadcast targets', badge: 'Client' },
                  { room: 'broadcast', desc: 'Global broadcast room — system-wide notifications sent to all connected users', badge: 'All' }
                ].map(({ room, desc, badge }) => (
                  <div key={room} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                    <code className="shrink-0 rounded-lg bg-purple-50 px-2 py-1 text-xs font-mono text-[#7657F6]">{room}</code>
                    <p className="text-xs text-gray-600 flex-1">{desc}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge === 'Admin' ? 'bg-purple-100 text-purple-600' : badge === 'Client' ? 'bg-blue-100 text-blue-600' : 'bg-teal-100 text-teal-600'}`}>{badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emitted Events */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#20243A] mb-4">Real-Time Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {[
                  { event: 'admin:activity', dir: 'Server → Admin', desc: 'User registrations, logins, logouts' },
                  { event: 'admin:transaction', dir: 'Server → Admin', desc: 'Transaction CRUD live feed' },
                  { event: 'presence:count', dir: 'Server → All', desc: 'Online user count updates' },
                  { event: 'presence:user_online', dir: 'Server → Admin', desc: 'User connected event' },
                  { event: 'presence:user_offline', dir: 'Server → Admin', desc: 'User disconnected event' },
                  { event: 'notification:broadcast', dir: 'Server → Clients', desc: 'Admin-initiated broadcasts' },
                  { event: 'budget:alert', dir: 'Server → User', desc: 'Budget threshold exceeded (80%)' },
                  { event: 'system:maintenance', dir: 'Server → All', desc: 'Maintenance mode toggle' },
                  { event: 'user:deactivated', dir: 'Server → User', desc: 'Account deactivation notice' }
                ].map(({ event, dir, desc }) => (
                  <div key={event} className="flex items-start gap-2 rounded-xl bg-gray-50 p-3">
                    <div className="flex-1 min-w-0">
                      <code className="text-[#7657F6] font-mono">{event}</code>
                      <p className="text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 whitespace-nowrap">{dir}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Socket Activity (from Live Activity) */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#20243A]">Recent Socket Events</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isConnected ? 'Live Stream' : 'Offline'}
                </span>
              </div>
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Radio size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">No socket events captured yet</p>
                  <p className="text-xs mt-1">Events will appear here as users interact with FinTrack</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {activities.slice(0, 15).map((act) => (
                    <div key={act.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-medium text-gray-700 w-36 shrink-0">{act.type}</span>
                      <span className="text-gray-500 flex-1 truncate">{act.description}</span>
                      <span className="text-gray-400 shrink-0 truncate max-w-[150px]">
                        {typeof act.user === 'object' && act.user !== null
                          ? (act.user.name || act.user.email || '—')
                          : (act.user || '—')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SYSTEM MONITORING */}
        {activeTab === 'System Monitoring' && (
          <div className="space-y-6">
            {systemLoading && !systemInfo ? (
              <p className="text-xs text-gray-400 animate-pulse">Loading system telemetry...</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {/* Status card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Backend API</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      {systemInfo?.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-[#20243A]">Node.js Express</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Version: {systemInfo?.nodeVersion} · Platform: {systemInfo?.platform}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    Server Uptime:{' '}
                    <strong>{Math.floor((systemInfo?.serverUptimeSeconds || 0) / 60)} minutes</strong>
                  </div>
                </div>

                {/* Database card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Database Engine</span>
                    <Database size={16} className="text-emerald-500" />
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-[#20243A]">MongoDB Atlas</h3>
                  <p className="mt-1 text-xs text-emerald-600 font-semibold">
                    Status: {systemInfo?.database?.state}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    Host: <strong>{systemInfo?.database?.host}</strong>
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Process Memory</span>
                    <Cpu size={16} className="text-[#7657F6]" />
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-[#20243A]">
                    {systemInfo?.memory?.rssMB} MB
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Heap Used: {systemInfo?.memory?.heapUsedMB} MB /{' '}
                    {systemInfo?.memory?.heapTotalMB} MB
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    Active Client Sockets: <strong>{systemInfo?.socket?.activeClients}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: AUDIT LOGS */}
        {activeTab === 'Audit Logs' && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h4 className="font-bold text-[#20243A]">Security & Audit Logs</h4>
              <p className="text-xs text-gray-400">
                Immutable records of sensitive operations performed by administrators
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/70 text-gray-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No audit records saved yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(log.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-800">{log.adminName || 'Admin'}</p>
                          <p className="text-[10px] text-gray-400">{log.adminEmail}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#7657F6]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {log.targetType} {log.targetEmail ? `(${log.targetEmail})` : ''}
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                <span>
                  Page {auditPage} of {auditTotalPages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={auditPage >= auditTotalPages}
                    onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === 'Settings' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-w-2xl">
            <h4 className="font-bold text-[#20243A] flex items-center gap-2">
              <Settings size={18} className="text-[#7657F6]" /> System Settings & Maintenance Mode
            </h4>
            <p className="mt-1 text-xs text-gray-400">
              Control application availability and backend write-lockdown
            </p>

            {settingsStatus && (
              <div
                className={`mt-4 rounded-xl p-3 text-xs ${
                  settingsStatus.startsWith('Error')
                    ? 'border border-red-200 bg-red-50 text-red-700'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {settingsStatus}
              </div>
            )}

            <form onSubmit={handleSaveMaintenance} className="mt-6 space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="font-bold text-xs text-gray-800">Maintenance Mode Lockdown</p>
                  <p className="text-[11px] text-gray-400">
                    When enabled, non-admin users cannot perform financial modifications.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7657F6]"></div>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  User Maintenance Notification Message
                </label>
                <textarea
                  rows={3}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="FinTrack is undergoing scheduled system updates..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#7657F6]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="rounded-xl bg-[#7657F6] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-100 hover:bg-purple-700 transition disabled:opacity-60"
              >
                {isSavingSettings ? 'Saving & Broadcasting...' : 'Save & Enforce Maintenance Mode'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* USER DETAILS MODAL */}
      {detailsModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">User Profile & Transaction Metrics</h3>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-[#7657F6] uppercase">
                  {selectedUser.name ? selectedUser.name[0] : 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{selectedUser.name}</h4>
                  <p className="text-gray-400">{selectedUser.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                      {selectedUser.role}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedUser.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-[10px] text-gray-400">
                      {selectedUser.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-400">Total Transactions</p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedUser.transactionCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Total Income</p>
                  <p className="text-sm font-bold text-teal-600">
                    {money(selectedUser.totalIncome ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Total Expenses</p>
                  <p className="text-sm font-bold text-red-500">
                    {money(selectedUser.totalExpense ?? 0)}
                  </p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <p className="font-semibold text-gray-700 mb-2">Recent Transactions</p>
                {selectedUser.recentTransactions?.length === 0 ? (
                  <p className="text-gray-400">No transactions recorded by this user.</p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                    {selectedUser.recentTransactions?.map((tx) => (
                      <div key={tx._id} className="py-2 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{tx.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {tx.category} · {new Date(tx.date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <span
                          className={`font-semibold ${
                            tx.type === 'income' ? 'text-teal-600' : 'text-gray-800'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {money(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
