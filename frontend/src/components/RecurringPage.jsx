import { useState, useEffect, useCallback } from 'react'
import {
  getRecurring,
  createRecurring,
  toggleRecurring,
  deleteRecurring
} from '../services/recurringService'
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

const CATEGORIES = [
  'Food',
  'Shopping',
  'Transport',
  'Bills',
  'Entertainment',
  'Others',
  'Income'
]

function money(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN')
}

export default function RecurringPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Bills',
    frequency: 'monthly',
    dayOfMonth: 1
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getRecurring()
      setRules(res.rules || [])
    } catch {
      setRules([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title || !form.amount) {
      setError('Fill all fields')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createRecurring({
        ...form,
        amount: Number(form.amount),
        dayOfMonth: Number(form.dayOfMonth)
      })
      setForm({
        title: '',
        amount: '',
        type: 'expense',
        category: 'Bills',
        frequency: 'monthly',
        dayOfMonth: 1
      })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed')
    }
    setSaving(false)
  }

  async function handleToggle(id) {
    try {
      await toggleRecurring(id)
      await load()
    } catch {}
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this recurring rule?')) return
    try {
      await deleteRecurring(id)
      await load()
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800 flex items-center gap-2">
          <RefreshCw size={18} className="text-[#7657F6]" /> New Recurring Rule
        </h3>
        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6] w-36"
          />
          <input
            type="number"
            placeholder="Amount (₹)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6] w-36"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input
            type="number"
            min="1"
            max="31"
            placeholder="Day"
            value={form.dayOfMonth}
            onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6] w-20"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition disabled:opacity-60"
          >
            <Plus size={16} /> Add Rule
          </button>
        </form>
      </div>

      {/* Rules list */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800">Active Rules</h3>
        {loading ? (
          <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-gray-400">No recurring rules yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rules.map((r) => (
              <div
                key={r._id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium text-gray-800">{r.title}</p>
                  <p className="text-xs text-gray-400">
                    {r.category} · {r.frequency} · Day {r.dayOfMonth}
                  </p>
                  <p className="text-xs text-gray-400">
                    Next:{' '}
                    {r.nextRunDate
                      ? new Date(r.nextRunDate).toLocaleDateString('en-IN')
                      : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold text-sm ${
                      r.type === 'income' ? 'text-teal-600' : 'text-gray-800'
                    }`}
                  >
                    {r.type === 'income' ? '+' : '-'}
                    {money(r.amount)}
                  </span>
                  <button
                    onClick={() => handleToggle(r._id)}
                    title={r.isActive ? 'Deactivate' : 'Activate'}
                    className={r.isActive ? 'text-[#7657F6]' : 'text-gray-300'}
                  >
                    {r.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="text-gray-300 hover:text-red-500 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
