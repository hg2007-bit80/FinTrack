import { useState, useEffect, useCallback } from 'react'
import { getBudgets, createBudget, deleteBudget } from '../services/budgetService'
import { Trash2, Plus, Wallet } from 'lucide-react'

const CATEGORIES = ['Food', 'Shopping', 'Transport', 'Bills', 'Entertainment', 'Others']

function money(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN')
}

export default function BudgetsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ category: 'Food', monthlyLimit: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getBudgets(month, year)
      setBudgets(res.budgets || [])
    } catch {
      setBudgets([])
    }
    setLoading(false)
  }, [month, year])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.monthlyLimit || Number(form.monthlyLimit) <= 0) {
      setError('Enter a valid limit')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createBudget({
        category: form.category,
        monthlyLimit: Number(form.monthlyLimit),
        month,
        year
      })
      setForm({ category: 'Food', monthlyLimit: '' })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create budget')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this budget?')) return
    try {
      await deleteBudget(id)
      await load()
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Month/Year picker */}
      <div className="flex gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2024, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
        />
      </div>

      {/* Add budget form */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800 flex items-center gap-2">
          <Wallet size={18} className="text-[#7657F6]" /> Set Budget Limit
        </h3>
        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Monthly limit (₹)"
            value={form.monthlyLimit}
            onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6] w-44"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition disabled:opacity-60"
          >
            <Plus size={16} /> Add Budget
          </button>
        </form>
      </div>

      {/* Budget list */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800">Budget Limits & Progress</h3>
        {loading ? (
          <p className="text-sm text-gray-400 animate-pulse">Loading budgets...</p>
        ) : budgets.length === 0 ? (
          <p className="text-sm text-gray-400">No budgets set for this month.</p>
        ) : (
          <div className="space-y-5">
            {budgets.map((b) => {
              const pct = Math.min((b.spent / b.monthlyLimit) * 100, 100)
              const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-[#7657F6]'
              return (
                <div key={b._id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{b.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {money(b.spent)} / {money(b.monthlyLimit)}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-gray-500'
                        }`}
                      >
                        {Math.round(pct)}%
                      </span>
                      <button
                        onClick={() => handleDelete(b._id)}
                        className="text-gray-300 hover:text-red-500 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full transition-all ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
