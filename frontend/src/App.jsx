import { useState, useEffect, useMemo } from 'react'
import { setNavigateFn } from './context/AuthContext'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  PiggyBank,
  RefreshCw,
  Settings,
  Bell,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ShoppingBag,
  Trash2,
  Pencil,
  LogOut,
  LogIn,
  Radio,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
  AlertTriangle,
  Megaphone,
  ArrowRight,
  ChevronDown,
  User
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
  Cell
} from 'recharts'

import { useAuth } from './context/AuthContext'
import { useSocket } from './context/SocketContext'
import { useTransactions } from './context/TransactionContext'
import AuthModal from './components/AuthModal'
import AuthPage from './components/AuthPage'
import AdminDashboard from './components/AdminDashboard'
import BudgetAlert from './components/BudgetAlert'
import BudgetsPage from './components/BudgetsPage'
import SavingsPage from './components/SavingsPage'
import RecurringPage from './components/RecurringPage'
import ReportsPage from './components/ReportsPage'
import { importCSV, exportCSV } from './services/csvService'

const chartColors = ['#7657F6', '#3985F7', '#19BDA5', '#FFB547', '#F16B9B']

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Transactions', icon: ArrowLeftRight },
  { name: 'Budgets', icon: Wallet },
  { name: 'Savings', icon: PiggyBank },
  { name: 'Analytics', icon: ChartNoAxesCombined },
  { name: 'Recurring', icon: RefreshCw },
  { name: 'Reports', icon: ChartNoAxesCombined },
  { name: 'Notifications', icon: Bell },
  { name: 'Settings', icon: Settings }
]

function money(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN')
}

function App() {
  const { user, isAuthenticated, loading, logout } = useAuth()
  const { isConnected, maintenance, broadcastAlert, clearBroadcastAlert } = useSocket()
  const {
    transactions,
    loading: isLoading,
    error: errorMessage,
    income,
    expenses,
    balance,
    savings,
    expenseData,
    createTransaction,
    editTransaction,
    removeTransaction,
    refresh: refreshTransactions
  } = useTransactions()

  // Full client-side routing synchronized with browser URL
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  )

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (to, options = {}) => {
    if (options.replace) {
      window.history.replaceState({}, '', to)
    } else {
      window.history.pushState({}, '', to)
    }
    setCurrentPath(to)
  }

  // Register navigate function with AuthContext so logout() can redirect
  useEffect(() => {
    setNavigateFn(navigate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [activePage, setActivePage] = useState('Dashboard')
  const [showModal, setShowModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalPortal, setAuthModalPortal] = useState('client')
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [csvUploading, setCsvUploading] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const [form, setForm] = useState({
    name: '',
    category: 'Food',
    amount: '',
    type: 'expense'
  })

  // Derive real monthly trend data dynamically from user's live transactions
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const map = {}
    months.forEach((m) => {
      map[m] = { month: m, income: 0, expenses: 0 }
    })

    transactions.forEach((tx) => {
      const d = new Date(tx.rawDate || tx.date)
      if (!isNaN(d.getTime())) {
        const m = months[d.getMonth()]
        if (map[m]) {
          if (tx.type === 'income') {
            map[m].income += Number(tx.amount) || 0
          } else {
            map[m].expenses += Number(tx.amount) || 0
          }
        }
      }
    })

    const currentMonthIdx = new Date().getMonth()
    const result = []
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12
      result.push(map[months[idx]])
    }
    return result
  }, [transactions])

  // Synchronize route redirects via useEffect (NEVER inside render body)
  useEffect(() => {
    if (loading) return

    if (currentPath === '/login') {
      if (isAuthenticated) {
        navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
      }
    } else if (currentPath === '/' || currentPath.startsWith('/dashboard')) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true })
      } else if (user?.role === 'admin') {
        navigate('/admin', { replace: true })
      }
    }
  }, [currentPath, isAuthenticated, user, loading])

  // Open modal in Add mode
  const handleOpenAddModal = () => {
    setEditingId(null)
    setForm({
      name: '',
      category: 'Food',
      amount: '',
      type: 'expense'
    })
    setFormError('')
    setShowModal(true)
  }

  // Open modal in Edit mode
  const handleOpenEditModal = (tx) => {
    setEditingId(tx.id)
    setForm({
      name: tx.name,
      category: tx.category || 'Food',
      amount: tx.amount.toString(),
      type: tx.type || 'expense'
    })
    setFormError('')
    setShowModal(true)
  }

  // Handle Form Submit
  async function handleTransactionSubmit(e) {
    e.preventDefault()
    const amount = Number(form.amount)

    if (!form.name.trim()) {
      setFormError('Please enter a transaction title.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than 0.')
      return
    }

    try {
      setIsSaving(true)
      setFormError('')

      const payload = {
        title: form.name.trim(),
        amount,
        type: form.type,
        category: form.type === 'income' ? 'Income' : form.category,
        description: '',
        date: new Date().toISOString()
      }

      if (editingId) {
        await editTransaction(editingId, payload)
      } else {
        await createTransaction(payload)
      }

      setShowModal(false)
      setEditingId(null)
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please check inputs.')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Delete
  async function handleDeleteTransaction(id, name) {
    const confirmed = window.confirm(`Are you sure you want to delete "${name}"?`)
    if (!confirmed) return

    try {
      await removeTransaction(id)
    } catch (err) {
      alert(err.message || 'Could not delete transaction')
    }
  }

  // Handle CSV Import
  async function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setCsvUploading(true)
      const res = await importCSV(file)
      alert(`CSV Imported! ${res.count || 0} transactions added.`)
      refreshTransactions()
    } catch (err) {
      alert(err.message || 'CSV Import failed')
    } finally {
      setCsvUploading(false)
      e.target.value = ''
    }
  }

  // Handle CSV Export
  async function handleCSVDownload() {
    try {
      await exportCSV()
    } catch (err) {
      alert('CSV Export failed: ' + err.message)
    }
  }

  // Full-screen loading while checking token
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7657F6] border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading FinTrack...</p>
        </div>
      </div>
    )
  }

  // =========================================================================
  // ROUTE 1: /login (Dedicated Shared Authentication Page with Portal Selector)
  // =========================================================================
  if (currentPath === '/login') {
    if (isAuthenticated) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7657F6] border-t-transparent" />
        </div>
      )
    }

    return (
      <AuthPage
        initialPortal="client"
        onAuthSuccess={(portal) => {
          navigate(portal === 'admin' ? '/admin' : '/dashboard')
        }}
      />
    )
  }

  // =========================================================================
  // ROUTE 2: /admin (Role-Protected Admin Dashboard)
  // =========================================================================
  if (currentPath.startsWith('/admin')) {
    // If not authenticated, show unified auth page with Admin Portal preselected
    if (!isAuthenticated) {
      return (
        <AuthPage
          initialPortal="admin"
          onAuthSuccess={(portal) => {
            navigate(portal === 'admin' ? '/admin' : '/dashboard')
          }}
        />
      )
    }

    // Role guard: Reject ordinary clients from accessing /admin
    if (user?.role !== 'admin') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] p-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-xs text-gray-500">
              Your account (<strong>{user?.email}</strong>) is registered as a Client User and does not have administrative permissions to view the Admin Dashboard.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full rounded-2xl bg-[#7657F6] py-3 text-xs font-semibold text-white shadow-lg shadow-purple-100 hover:bg-purple-700 transition"
              >
                Return to Client Dashboard
              </button>
              <button
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="w-full rounded-2xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Sign In with an Admin Account
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Authenticated administrator -> render AdminDashboard
    return <AdminDashboard onExit={() => navigate('/login')} />
  }

  // =========================================================================
  // ROUTE 3: /dashboard and / (Client Dashboard & Features)
  // =========================================================================

  // If not authenticated, render AuthPage immediately (never a blank screen)
  if (!isAuthenticated) {
    return (
      <AuthPage
        initialPortal="client"
        onAuthSuccess={(portal) => {
          navigate(portal === 'admin' ? '/admin' : '/dashboard')
        }}
      />
    )
  }

  // If logged-in user is an admin accessing client dashboard, wait for redirect
  if (user?.role === 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7657F6] border-t-transparent" />
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Balance',
      amount: money(balance),
      change: `${transactions.length} total transaction${transactions.length === 1 ? '' : 's'}`,
      icon: CreditCard,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Total Income',
      amount: money(income),
      change: `${transactions.filter((t) => t.type === 'income').length} income transaction${transactions.filter((t) => t.type === 'income').length === 1 ? '' : 's'}`,
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Total Expenses',
      amount: money(expenses),
      change: `${transactions.filter((t) => t.type === 'expense').length} expense${transactions.filter((t) => t.type === 'expense').length === 1 ? '' : 's'} recorded`,
      icon: TrendingDown,
      color: 'bg-pink-100 text-pink-600'
    },
    {
      title: 'Savings',
      amount: money(savings),
      change: `Savings rate: ${income > 0 ? Math.round(((income - expenses) / income) * 100) : 0}%`,
      icon: PiggyBank,
      color: 'bg-teal-100 text-teal-600'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F7F8FC] md:flex">
      {/* Real-Time Sockets: Global Budget Alert Toast */}
      <BudgetAlert />

      {/* Real-Time Sockets: Admin Broadcast Alert Toast */}
      {broadcastAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex w-full max-w-md items-start gap-3 rounded-2xl border border-purple-200 bg-white p-4 shadow-2xl animate-fade-in">
          <div className="rounded-xl bg-purple-50 p-2 text-[#7657F6]">
            <Megaphone size={20} />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-gray-800 text-sm">{broadcastAlert.title}</p>
            <p className="mt-1 text-gray-600">{broadcastAlert.message}</p>
            <p className="mt-1 text-[10px] text-gray-400">
              Broadcast from Admin · {broadcastAlert.sender || 'System'}
            </p>
          </div>
          <button
            onClick={clearBroadcastAlert}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full shrink-0 bg-white p-6 md:min-h-screen md:w-64 md:border-r border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#7657F6]">
              FinTrack<span className="text-gray-800">.</span>
            </h1>

            {/* Socket.io Live Status Badge */}
            <div
              title={
                isConnected
                  ? 'Real-Time Sync Connected (Socket.IO)'
                  : 'Disconnected from Real-Time Server'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isConnected ? 'Live' : 'Polling'}
            </div>
          </div>

          <p className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </p>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActivePage(item.name)
                    if (currentPath !== '/dashboard') {
                      navigate('/dashboard')
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                    activePage === item.name
                      ? 'bg-[#7657F6] text-white shadow-lg shadow-purple-100'
                      : 'text-gray-500 hover:bg-purple-50 hover:text-[#7657F6]'
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User profile / Auth panel in sidebar */}
        <div className="mt-8 border-t border-gray-100 pt-4">
          {isAuthenticated ? (
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7657F6] text-sm font-bold text-white uppercase">
                  {user?.name ? user.name[0] : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-gray-800">{user?.name}</p>
                    {user?.role === 'admin' && (
                      <span className="rounded bg-purple-100 px-1 py-0.2 text-[9px] font-bold text-[#7657F6] uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-gray-400">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={async () => { await logout() }}
                title="Log out"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-500 transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthModalPortal('client')
                setShowAuthModal(true)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#7657F6] bg-purple-50/50 px-4 py-2.5 text-xs font-semibold text-[#7657F6] hover:bg-[#7657F6] hover:text-white transition"
            >
              <LogIn size={15} />
              Sign In / Select Portal
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-5 md:p-8 overflow-y-auto">
        {/* Maintenance Mode Banner */}
        {maintenance?.active && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">System Maintenance Active</p>
                <p className="opacity-90">{maintenance.message}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-lg bg-amber-200/60 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">
              Admin Protected
            </span>
          </div>
        )}

        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">Your personal finance space</p>
              {isAuthenticated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <UserCheck size={12} /> Authenticated
                </span>
              )}
            </div>

            <h2 className="mt-1 text-2xl font-bold text-[#20243A]">
              {activePage === 'Dashboard'
                ? isAuthenticated
                  ? `Welcome back, ${user?.name?.split(' ')[0]}! 👋`
                  : 'Welcome to FinTrack! 👋'
                : activePage}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {activePage === 'Dashboard'
                ? "Here's your live financial overview and transaction insights."
                : `Manage and explore your ${activePage.toLowerCase()}.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs font-medium shadow-sm">
              <Radio
                size={14}
                className={isConnected ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}
              />
              <span className={isConnected ? 'text-gray-700' : 'text-gray-400'}>
                {isConnected ? 'Socket.IO Real-Time' : 'Connecting Real-Time...'}
              </span>
            </div>

            {!isAuthenticated ? (
              <button
                onClick={() => {
                  setAuthModalPortal('client')
                  setShowAuthModal(true)
                }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-[#7657F6] hover:text-[#7657F6] transition"
              >
                <LogIn size={16} />
                Sign In
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:border-[#7657F6] transition"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7657F6] text-xs font-bold text-white uppercase">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                  <span className="hidden sm:inline font-medium text-gray-800">{user?.name}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl animate-fade-in"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="border-b border-gray-100 px-3 py-2.5">
                      <p className="truncate text-xs font-bold text-gray-800">{user?.name}</p>
                      <p className="truncate text-[10px] text-gray-400">{user?.email}</p>
                      <span className="mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-[#7657F6] uppercase">
                        {user?.role === 'admin' ? 'Administrator' : 'Client User'}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActivePage('Settings')
                          setUserMenuOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                      >
                        <Settings size={14} /> Account Settings
                      </button>
                    </div>

                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false)
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
            )}

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 rounded-xl bg-[#7657F6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 transition"
            >
              <Plus size={18} />
              Add Transaction
            </button>
          </div>
        </header>

        {/* Global Error message */}
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* PAGE 1: DASHBOARD */}
        {activePage === 'Dashboard' && (
          <>
            {isLoading && (
              <p className="mb-4 text-sm text-gray-500 animate-pulse">
                Loading your live transactions from the database...
              </p>
            )}

            {/* Statistics */}
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.title}
                    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <span className={`rounded-lg p-2 ${stat.color}`}>
                        <Icon size={19} />
                      </span>
                    </div>

                    <h3 className="mt-5 text-2xl font-bold text-[#20243A]">{stat.amount}</h3>

                    <p className="mt-2 text-xs text-gray-400">{stat.change}</p>
                  </div>
                )
              })}
            </section>

            {/* Charts */}
            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#20243A]">Financial Overview</h3>
                  <p className="mt-1 text-sm text-gray-400">Monthly income vs expenses</p>
                </div>

                {transactions.length === 0 ? (
                  <div className="flex h-72 flex-col items-center justify-center text-center text-sm text-gray-400">
                    <CreditCard size={40} className="mb-2.5 opacity-30 text-[#7657F6]" />
                    <p className="font-medium text-gray-600">No transactions recorded yet</p>
                    <p className="mt-1 text-xs text-gray-400 max-w-sm">
                      Your financial overview chart will automatically reflect your income and expenses the moment you add a transaction.
                    </p>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeef5" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `₹${value / 1000}k`}
                        />
                        <Tooltip formatter={(value) => money(value)} />
                        <Bar dataKey="income" name="Income" fill="#7657F6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#19BDA5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Expense breakdown */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#20243A]">Expense Breakdown</h3>
                <p className="mt-1 text-sm text-gray-400">Spending by category</p>

                {expenseData.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center text-center text-sm text-gray-400">
                    <p>No expense data recorded yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={58}
                            outerRadius={85}
                            paddingAngle={4}
                          >
                            {expenseData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={chartColors[index % chartColors.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => money(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {expenseData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-500">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: chartColors[index % chartColors.length]
                              }}
                            />
                            {item.name}
                          </div>
                          <span className="font-semibold text-gray-700">
                            {money(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {/* PAGE 2: TRANSACTIONS TAB */}
        {activePage === 'Transactions' && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">All Transactions</h3>
                <p className="text-xs text-gray-400">
                  Live-synced across active browser tabs & devices
                </p>
              </div>

              {/* CSV Import & Export Controls */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
                  <Upload size={14} />
                  {csvUploading ? 'Importing...' : 'Import CSV'}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={csvUploading}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleCSVDownload}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                  <Download size={14} /> Export CSV
                </button>

                <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-2 rounded-xl">
                  Total: {transactions.length}
                </span>
              </div>
            </div>

            {isLoading && (
              <p className="py-6 text-center text-sm text-gray-500">
                Loading transactions...
              </p>
            )}

            {!isLoading && transactions.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                No transactions yet. Click “Add Transaction” or “Import CSV”.
              </p>
            )}

            <div className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 transition hover:bg-gray-50/50 px-2 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl p-3 ${
                        t.type === 'income'
                          ? 'bg-teal-50 text-teal-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}
                    >
                      {t.type === 'income' ? <TrendingUp size={20} /> : <ShoppingBag size={20} />}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">
                        {t.category} · {t.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p
                      className={`font-bold ${
                        t.type === 'income' ? 'text-teal-600' : 'text-gray-800'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {money(t.amount)}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(t)}
                      title={`Edit ${t.name}`}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(t.id, t.name)}
                      title={`Delete ${t.name}`}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PAGE 3: BUDGETS */}
        {activePage === 'Budgets' && <BudgetsPage />}

        {/* PAGE 4: SAVINGS */}
        {activePage === 'Savings' && <SavingsPage />}

        {/* PAGE 5: ANALYTICS */}
        {activePage === 'Analytics' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#20243A]">Income vs Expenses</h3>
              <p className="mt-1 text-sm text-gray-400">Monthly financial trend from your transactions</p>
              {transactions.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center text-center text-sm text-gray-400">
                  <ChartNoAxesCombined size={40} className="mb-2.5 opacity-30 text-[#7657F6]" />
                  <p className="font-medium text-gray-600">No transaction data to analyze yet</p>
                  <p className="mt-1 text-xs text-gray-400 max-w-sm">
                    Add transactions to unlock visual trends, income-to-expense analysis, and category distributions.
                  </p>
                </div>
              ) : (
                <div className="h-72 mt-6 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeef5" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip formatter={(v) => money(v)} />
                      <Bar dataKey="income" name="Income" fill="#7657F6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#19BDA5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Transactions</p>
                <p className="mt-2 text-3xl font-bold text-[#20243A]">{transactions.length}</p>
                <p className="mt-1 text-xs text-gray-400">All-time recorded</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Savings Rate</p>
                <p className="mt-2 text-3xl font-bold text-teal-600">
                  {income > 0 ? Math.round(((income - expenses) / income) * 100) : 0}%
                </p>
                <p className="mt-1 text-xs text-gray-400">Income saved this period</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Avg. Transaction</p>
                <p className="mt-2 text-3xl font-bold text-[#20243A]">
                  {transactions.length > 0 ? money(Math.round((income + expenses) / transactions.length)) : '₹0'}
                </p>
                <p className="mt-1 text-xs text-gray-400">Per transaction average</p>
              </div>
            </div>
            {expenseData.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#20243A]">Expense Breakdown</h3>
                <p className="mt-1 text-sm text-gray-400">Your spending by category</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                        {expenseData.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {expenseData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                        {item.name}
                      </div>
                      <span className="font-semibold text-gray-700">{money(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* PAGE 6: RECURRING */}
        {activePage === 'Recurring' && <RecurringPage />}

        {/* PAGE 7: REPORTS */}
        {activePage === 'Reports' && <ReportsPage />}

        {/* PAGE 8: NOTIFICATIONS */}
        {activePage === 'Notifications' && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
              <p className="text-xs text-gray-400 mt-1">Real-time alerts and system messages from your FinTrack account</p>
            </div>
            <div className="space-y-3">
              {broadcastAlert ? (
                <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="rounded-lg bg-purple-100 p-2 text-[#7657F6]"><Megaphone size={18} /></div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{broadcastAlert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{broadcastAlert.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Broadcast from Admin · {broadcastAlert.sender || 'System'}</p>
                  </div>
                  <button onClick={clearBroadcastAlert} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <Bell size={40} className="mb-3 opacity-30" />
                  <p className="font-semibold text-sm">No notifications yet</p>
                  <p className="text-xs mt-1">Budget alerts and admin broadcasts will appear here in real time.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* PAGE 9: SETTINGS */}
        {activePage === 'Settings' && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Profile Settings</h3>
              <p className="text-xs text-gray-400 mt-1">Manage your FinTrack account preferences</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7657F6] text-xl font-bold text-white uppercase">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#7657F6]">
                      {user?.role === 'admin' ? 'Administrator' : 'Client User'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Account Status</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active & Authenticated
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Real-Time Sync</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {isConnected ? 'Socket.IO Connected' : 'Reconnecting...'}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-red-700">Danger Zone</h3>
              <p className="text-xs text-gray-400 mt-1 mb-4">These actions are permanent and cannot be undone.</p>
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to log out?')) {
                    await logout()
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 FinTrack. Role-based client & administrative financial platform.
        </p>
      </main>

      {/* Add / Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {formError}
              </div>
            )}

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Transaction name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Grocery shopping"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#7657F6]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Amount (₹)</label>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#7657F6]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#7657F6]"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {form.type === 'expense' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#7657F6]"
                  >
                    <option>Food</option>
                    <option>Shopping</option>
                    <option>Transport</option>
                    <option>Bills</option>
                    <option>Entertainment</option>
                    <option>Others</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-[#7657F6] py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? 'Saving...'
                  : editingId
                  ? 'Update Transaction'
                  : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Unified Authentication Modal with Portal Selection */}
      <AuthModal
        isOpen={showAuthModal}
        initialPortal={authModalPortal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(portal) => {
          navigate(portal === 'admin' ? '/admin' : '/dashboard')
        }}
      />
    </div>
  )
}

export default App
