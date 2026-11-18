import { useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  PiggyBank,
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
  UserCheck
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
} from 'recharts'

import { useAuth } from './context/AuthContext'
import { useSocket } from './context/SocketContext'
import { useTransactions } from './context/TransactionContext'
import AuthModal from './components/AuthModal'

const monthlyData = [
  { month: 'Jan', income: 45000, expenses: 22000 },
  { month: 'Feb', income: 52000, expenses: 28000 },
  { month: 'Mar', income: 48000, expenses: 25000 },
  { month: 'Apr', income: 60000, expenses: 30000 },
  { month: 'May', income: 55000, expenses: 27000 },
  { month: 'Jun', income: 65000, expenses: 24550 },
]

const chartColors = [
  '#7657F6',
  '#3985F7',
  '#19BDA5',
  '#FFB547',
  '#F16B9B',
]

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Transactions', icon: ArrowLeftRight },
  { name: 'Budgets', icon: Wallet },
  { name: 'Analytics', icon: ChartNoAxesCombined },
  { name: 'Savings', icon: PiggyBank },
  { name: 'Settings', icon: Settings },
]

function money(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN')
}

function App() {
  const { user, isAuthenticated, logout } = useAuth()
  const { isConnected } = useSocket()
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
    removeTransaction
  } = useTransactions()

  const [activePage, setActivePage] = useState('Dashboard')
  const [showModal, setShowModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({
    name: '',
    category: 'Food',
    amount: '',
    type: 'expense',
  })

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

  // Open modal in Edit mode (demonstrating REST PUT)
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

  // Handle Form Submit (POST or PUT)
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

  const stats = [
    {
      title: 'Total Balance',
      amount: money(balance),
      change: '+12.5%',
      icon: CreditCard,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Total Income',
      amount: money(income),
      change: '+8.2%',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Total Expenses',
      amount: money(expenses),
      change: '-4.3%',
      icon: TrendingDown,
      color: 'bg-pink-100 text-pink-600',
    },
    {
      title: 'Savings',
      amount: money(savings),
      change: '+15.8%',
      icon: PiggyBank,
      color: 'bg-teal-100 text-teal-600',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F7F8FC] md:flex">
      {/* Sidebar */}
      <aside className="w-full shrink-0 bg-white p-6 md:min-h-screen md:w-64 md:border-r border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#7657F6]">
              FinTrack<span className="text-gray-800">.</span>
            </h1>

            {/* Socket.io Live Status Badge on Sidebar */}
            <div
              title={isConnected ? 'Real-Time Sync Connected (Socket.IO)' : 'Disconnected from Real-Time Server'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'Live' : 'Polling'}
            </div>
          </div>

          <p className="mt-10 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </p>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => setActivePage(item.name)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    activePage === item.name
                      ? 'bg-[#7657F6] text-white shadow-lg shadow-purple-100'
                      : 'text-gray-500 hover:bg-purple-50 hover:text-[#7657F6]'
                  }`}
                >
                  <Icon size={19} />
                  {item.name}
                </button>
              )
            })}
          </nav>

          <div className="mt-8 rounded-2xl bg-purple-50 p-4">
            <PiggyBank className="mb-3 text-[#7657F6]" size={25} />
            <p className="font-semibold text-gray-800">Save more!</p>
            <p className="mt-1 text-xs text-gray-500">
              Real-time synchronization keeps your finances up-to-date across all devices.
            </p>
          </div>
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
                  <p className="truncate text-xs font-bold text-gray-800">{user?.name}</p>
                  <p className="truncate text-[10px] text-gray-400">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-500 transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#7657F6] bg-purple-50/50 px-4 py-2.5 text-xs font-semibold text-[#7657F6] hover:bg-[#7657F6] hover:text-white transition"
            >
              <LogIn size={15} />
              Sign In / Register
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-5 md:p-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
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
            {/* Real-time Indicator Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs font-medium shadow-sm">
              <Radio size={14} className={isConnected ? 'text-emerald-500 animate-pulse' : 'text-gray-400'} />
              <span className={isConnected ? 'text-gray-700' : 'text-gray-400'}>
                {isConnected ? 'Socket.IO Real-Time' : 'Connecting Real-Time...'}
              </span>
            </div>

            {!isAuthenticated && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:border-[#7657F6] hover:text-[#7657F6] transition"
              >
                <LogIn size={16} />
                Sign In
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 rounded-xl bg-[#7657F6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 transition"
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

        {/* Dashboard */}
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

                    <h3 className="mt-5 text-2xl font-bold text-[#20243A]">
                      {stat.amount}
                    </h3>

                    <p className="mt-2 text-xs text-gray-400">
                      {stat.change} compared to last month
                    </p>
                  </div>
                )
              })}
            </section>

            {/* Charts */}
            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Monthly income and expenses */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#20243A]">Financial Overview</h3>
                  <p className="mt-1 text-sm text-gray-400">Monthly income vs expenses</p>
                </div>

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
                                backgroundColor: chartColors[index % chartColors.length],
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

            {/* Budget progress */}
            <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#20243A]">Budget Progress</h3>
              <p className="mt-1 text-sm text-gray-400">Monthly spending limits</p>

              {[
                { name: 'Food', amount: '₹4,500 / ₹8,000', width: '56%', color: 'bg-purple-500' },
                { name: 'Shopping', amount: '₹3,200 / ₹5,000', width: '64%', color: 'bg-blue-500' },
                { name: 'Transport', amount: '₹1,500 / ₹3,000', width: '50%', color: 'bg-teal-500' },
              ].map((budget) => (
                <div key={budget.name} className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{budget.name}</span>
                    <span className="text-xs text-gray-400">{budget.amount}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${budget.color}`} style={{ width: budget.width }} />
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {/* Transactions Tab */}
        {activePage === 'Transactions' && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">All Transactions</h3>
                <p className="text-xs text-gray-400">Live-synced across active browser tabs & devices</p>
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
                Total: {transactions.length}
              </span>
            </div>

            {isLoading && (
              <p className="py-6 text-center text-sm text-gray-500">
                Loading transactions...
              </p>
            )}

            {!isLoading && transactions.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                No transactions yet. Click “Add Transaction” to create your first one.
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

                  {/* Amount, Edit (PUT), and Delete buttons */}
                  <div className="flex items-center gap-3">
                    <p
                      className={`font-bold ${
                        t.type === 'income' ? 'text-teal-600' : 'text-gray-800'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {money(t.amount)}
                    </p>

                    {/* Edit button -> Demonstrates REST PUT */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(t)}
                      title={`Edit ${t.name}`}
                      aria-label={`Edit ${t.name}`}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil size={17} />
                    </button>

                    {/* Delete button -> Demonstrates REST DELETE */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(t.id, t.name)}
                      title={`Delete ${t.name}`}
                      aria-label={`Delete ${t.name}`}
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

        {/* Other pages */}
        {['Budgets', 'Analytics', 'Savings', 'Settings'].includes(activePage) && (
          <section className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#7657F6]">
              {activePage === 'Budgets' && <Wallet size={30} />}
              {activePage === 'Analytics' && <ChartNoAxesCombined size={30} />}
              {activePage === 'Savings' && <PiggyBank size={30} />}
              {activePage === 'Settings' && <Settings size={30} />}
            </div>

            <h3 className="text-xl font-bold text-gray-800">{activePage}</h3>
            <p className="mt-2 text-sm text-gray-400">
              This module is connected to the real-time backend state.
            </p>
          </section>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 FinTrack. Real-time financial management platform.
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
                aria-label="Close"
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Amount (₹)
                </label>
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
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Category
                  </label>
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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}

export default App
