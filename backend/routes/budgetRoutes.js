const express = require('express')
const router = express.Router()
const Budget = require('../models/Budget')
const Transaction = require('../models/transaction')
const { optionalAuth } = require('../middleware/auth')
const { body, validationResult } = require('express-validator')

router.use(optionalAuth)

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }
  next()
}

const budgetValidation = [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('monthlyLimit').isFloat({ min: 1 }).withMessage('Monthly limit must be > 0'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
  body('year').isInt({ min: 2020, max: 2100 }).withMessage('Invalid year'),
  validate
]

// GET all budgets for current month
router.get('/', async (req, res) => {
  try {
    const now = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year = parseInt(req.query.year) || now.getFullYear()

    const query = { month, year }
    if (req.user) query.user = req.user._id

    const budgets = await Budget.find(query)

    // For each budget, calculate amount spent this month
    const enriched = await Promise.all(budgets.map(async (budget) => {
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59)

      const txQuery = {
        type: 'expense',
        category: budget.category,
        date: { $gte: start, $lte: end }
      }
      if (req.user) {
        txQuery.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
      }

      const transactions = await Transaction.find(txQuery)
      const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
      const percentage = Math.round((spent / budget.monthlyLimit) * 100)

      return {
        ...budget.toObject(),
        spent,
        percentage,
        remaining: Math.max(0, budget.monthlyLimit - spent)
      }
    }))

    res.status(200).json({ success: true, budgets: enriched })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create or update budget
router.post('/', budgetValidation, async (req, res) => {
  try {
    const { category, monthlyLimit, month, year } = req.body

    const query = { category, month: parseInt(month), year: parseInt(year) }
    if (req.user) query.user = req.user._id

    const budget = await Budget.findOneAndUpdate(
      query,
      { ...query, monthlyLimit, alertSent80: false, alertSent100: false },
      { upsert: true, new: true, runValidators: true }
    )

    // Check current spending and emit alert if already over threshold
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const txQuery = { type: 'expense', category, date: { $gte: start, $lte: end } }
    if (req.user) {
      txQuery.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    }
    const transactions = await Transaction.find(txQuery)
    const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
    const percentage = Math.round((spent / monthlyLimit) * 100)

    const io = req.app.get('io')
    if (io && percentage >= 80) {
      io.emit('budget:alert', {
        category,
        spent,
        limit: monthlyLimit,
        percentage,
        type: percentage >= 100 ? 'exceeded' : 'warning'
      })
    }

    res.status(201).json({
      success: true,
      message: 'Budget saved successfully',
      budget: { ...budget.toObject(), spent, percentage, remaining: Math.max(0, monthlyLimit - spent) }
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE a budget
router.delete('/:id', async (req, res) => {
  try {
    await Budget.findByIdAndDelete(req.params.id)
    res.status(200).json({ success: true, message: 'Budget deleted' })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

module.exports = router
