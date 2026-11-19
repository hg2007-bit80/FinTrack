import { useState, useEffect } from 'react'
import { getMonthlyReport, getCategoryBreakdown } from '../services/reportService'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download } from 'lucide-react'

const COLORS = ['#7657F6', '#3985F7', '#19BDA5', '#FFB547', '#F16B9B', '#6366f1']

function money(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN')
}

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [monthly, setMonthly] = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const now = new Date()
    Promise.all([
      getMonthlyReport(year)
        .then((r) => setMonthly(r.data || []))
        .catch(() => setMonthly([])),
      getCategoryBreakdown(now.getMonth() + 1, year)
        .then((r) => setBreakdown(r.data || []))
        .catch(() => setBreakdown([]))
    ]).finally(() => setLoading(false))
  }, [year])

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`FinTrack Report — ${year}`, 14, 20)

    autoTable(doc, {
      startY: 30,
      head: [['Month', 'Income', 'Expenses', 'Savings']],
      body: monthly.map((m) => [
        m.month,
        money(m.income),
        money(m.expenses),
        money(m.savings)
      ])
    })

    doc.save(`fintrack-report-${year}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7657F6]"
        />
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
        >
          <Download size={16} /> Export PDF
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Loading reports...</p>
      ) : (
        <>
          {/* Monthly bar chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-800">
              Monthly Income vs Expenses — {year}
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeef5" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
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
                  <Bar
                    dataKey="savings"
                    name="Savings"
                    fill="#FFB547"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category breakdown pie */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-800">
              Category Breakdown (This Month)
            </h3>
            {breakdown.length === 0 ? (
              <p className="text-sm text-gray-400">No expense data for this month.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="total"
                      nameKey="_id"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {breakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
