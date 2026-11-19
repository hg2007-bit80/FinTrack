const express = require('express')
const router = express.Router()
const Transaction = require('../models/transaction')
const { optionalAuth } = require('../middleware/auth')

router.use(optionalAuth)

// GET /api/reports/monthly?year=2026
router.get('/monthly', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear()

    const matchStage = { date: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) } }
    if (req.user) {
      matchStage.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    }

    const result = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ])

    // Build 12-month structure
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthly = monthNames.map((month, i) => {
      const incomeRow = result.find(r => r._id.month === i + 1 && r._id.type === 'income')
      const expenseRow = result.find(r => r._id.month === i + 1 && r._id.type === 'expense')
      return {
        month,
        income: incomeRow ? incomeRow.total : 0,
        expenses: expenseRow ? expenseRow.total : 0,
        savings: (incomeRow ? incomeRow.total : 0) - (expenseRow ? expenseRow.total : 0)
      }
    })

    res.status(200).json({ success: true, year, data: monthly })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/reports/yearly
router.get('/yearly', async (req, res) => {
  try {
    const matchStage = {}
    if (req.user) {
      matchStage.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    }

    const result = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { year: { $year: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1 } }
    ])

    const years = [...new Set(result.map(r => r._id.year))].sort()
    const yearly = years.map(year => {
      const income = result.find(r => r._id.year === year && r._id.type === 'income')
      const expense = result.find(r => r._id.year === year && r._id.type === 'expense')
      return {
        year,
        income: income ? income.total : 0,
        expenses: expense ? expense.total : 0,
        savings: (income ? income.total : 0) - (expense ? expense.total : 0),
        transactionCount: (income ? income.count : 0) + (expense ? expense.count : 0)
      }
    })

    res.status(200).json({ success: true, data: yearly })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/reports/category-breakdown?month=11&year=2026
router.get('/category-breakdown', async (req, res) => {
  try {
    const now = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year = parseInt(req.query.year) || now.getFullYear()

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)

    const matchStage = { type: 'expense', date: { $gte: start, $lte: end } }
    if (req.user) {
      matchStage.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    }

    const result = await Transaction.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ])

    const breakdown = result.map(r => ({ category: r._id, total: r.total, count: r.count }))
    const grandTotal = breakdown.reduce((s, r) => s + r.total, 0)

    res.status(200).json({ success: true, breakdown, grandTotal, month, year })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
