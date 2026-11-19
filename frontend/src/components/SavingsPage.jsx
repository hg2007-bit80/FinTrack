import { useState, useEffect, useCallback } from 'react'
import {
  getSavingsGoals,
  createSavingsGoal,
  contributeToGoal,
  deleteSavingsGoal
} from '../services/savingsService'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { PiggyBank, Plus, Trash2, Target } from 'lucide-react'

function money(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN')
}

export default function SavingsPage() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '' })
  const [contributeModal, setContributeModal] = useState(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSavingsGoals()
      setGoals(res.goals || [])
    } catch {
      setGoals([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name || !form.targetAmount) {
      setError('Fill all fields')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createSavingsGoal({ ...form, targetAmount: Number(form.targetAmount) })
      setForm({ name: '', targetAmount: '', targetDate: '' })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed')
    }
    setSaving(false)
  }

  async function handleContribute() {
    if (!contributeAmount || Number(contributeAmount) <= 0) return
    try {
      await contributeToGoal(contributeModal, Number(contributeAmount))
      setContributeModal(null)
      setContributeAmount('')
      await load()
    } catch {}
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this savings goal?')) return
    try {
      await deleteSavingsGoal(id)
      await load()
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-800 flex items-center gap-2">
          <Target size={18} className="text-[#7657F6]" /> New Savings Goal
        </h3>
        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            placeholder="Goal name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6] w-44"
          />
          <input
            type="number"
            placeholder="Target amount (₹)"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6] w-44"
          />
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition disabled:opacity-60"
          >
            <Plus size={16} /> Add Goal
          </button>
        </form>
      </div>

      {/* Goals grid */}
      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Loading goals...</p>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <PiggyBank size={40} className="mx-auto mb-3 text-purple-200" />
          <p className="text-sm text-gray-400">No savings goals yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100)
            const chartData = [
              { name: g.name, value: pct, fill: g.isCompleted ? '#19BDA5' : '#7657F6' }
            ]
            return (
              <div
                key={g._id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{g.name}</p>
                    {g.isCompleted && (
                      <span className="text-xs text-teal-600 font-semibold">✅ Completed!</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(g._id)}
                    className="text-gray-300 hover:text-red-500 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      data={chartData}
                      startAngle={180}
                      endAngle={-180}
                    >
                      <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        background={{ fill: '#f3f4f6' }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center -mt-6">
                  <p className="text-2xl font-bold text-[#7657F6]">{Math.round(pct)}%</p>
                  <p className="text-xs text-gray-400">
                    {money(g.currentAmount)} / {money(g.targetAmount)}
                  </p>
                  {g.targetDate && (
                    <p className="text-xs text-gray-400 mt-1">
                      Target: {new Date(g.targetDate).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
                {!g.isCompleted && (
                  <button
                    onClick={() => {
                      setContributeModal(g._id)
                      setContributeAmount('')
                    }}
                    className="mt-4 w-full rounded-xl bg-purple-50 py-2 text-sm font-semibold text-[#7657F6] hover:bg-purple-100 transition"
                  >
                    + Contribute
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Contribute modal */}
      {contributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-semibold text-gray-800">Contribute to Goal</h3>
            <input
              type="number"
              placeholder="Amount (₹)"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#7657F6] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleContribute}
                className="flex-1 rounded-xl bg-[#7657F6] py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition"
              >
                Add Funds
              </button>
              <button
                onClick={() => setContributeModal(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
