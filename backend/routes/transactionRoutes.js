const express = require('express')
const router = express.Router()
const Transaction = require('../models/transaction')
const { optionalAuth } = require('../middleware/auth')
const { transactionValidation } = require('../middleware/validator')

// Apply optionalAuth to all routes so req.user is populated if token is present
router.use(optionalAuth)

// GET: Fetch all transactions (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const query = {}

    // User scoping: if logged in, show user transactions + legacy unassigned transactions
    if (req.user) {
      query.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    }

    // Optional filtering by type (income/expense)
    if (req.query.type) {
      query.type = req.query.type
    }

    // Optional filtering by category
    if (req.query.category) {
      query.category = req.query.category
    }

    // Optional search by title
    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: 'i' }
    }

    const transactions = await Transaction.find(query).sort({ date: -1 })

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    })
  }
})

// GET: Fetch a single transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
    }

    res.status(200).json({
      success: true,
      transaction
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid transaction ID',
      error: error.message
    })
  }
})

// POST: Add a new transaction
router.post('/', transactionValidation, async (req, res) => {
  try {
    const { title, amount, type, category, description, date } = req.body

    const transaction = await Transaction.create({
      user: req.user ? req.user._id : null,
      title,
      amount,
      type,
      category,
      description: description || '',
      date: date || Date.now()
    })

    // Real-Time Socket.IO broadcast
    const io = req.app.get('io')
    if (io) {
      io.emit('transaction:created', transaction)
    }

    res.status(201).json({
      success: true,
      message: 'Transaction added successfully',
      transaction
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to add transaction',
      error: error.message
    })
  }
})

// PUT: Update an existing transaction (Full REST API implementation)
router.put('/:id', transactionValidation, async (req, res) => {
  try {
    const { title, amount, type, category, description, date } = req.body

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        title,
        amount,
        type,
        category,
        description: description || '',
        date: date || Date.now()
      },
      { new: true, runValidators: true }
    )

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
    }

    // Real-Time Socket.IO broadcast
    const io = req.app.get('io')
    if (io) {
      io.emit('transaction:updated', transaction)
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      transaction
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update transaction',
      error: error.message
    })
  }
})

// DELETE: Delete a transaction by ID
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id)

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
    }

    // Real-Time Socket.IO broadcast
    const io = req.app.get('io')
    if (io) {
      io.emit('transaction:deleted', { id: req.params.id })
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      id: req.params.id
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to delete transaction',
      error: error.message
    })
  }
})

module.exports = router
