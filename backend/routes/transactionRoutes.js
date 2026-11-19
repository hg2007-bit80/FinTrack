const express = require('express')
const router = express.Router()
const Transaction = require('../models/transaction')
const { optionalAuth, checkMaintenance } = require('../middleware/auth')
const { transactionValidation } = require('../middleware/validator')
const { checkBudgetAlerts } = require('../utils/budgetAlerts')

// Apply optionalAuth and checkMaintenance
router.use(optionalAuth)
router.use(checkMaintenance)

// GET: Fetch all transactions (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const query = {}

    // User scoping: when logged in, strictly show ONLY the authenticated user's transactions
    if (req.user) {
      query.user = req.user._id
    } else {
      // Unauthenticated requests should never see other users' data or dummy data
      return res.status(200).json({
        success: true,
        count: 0,
        transactions: []
      })
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

    // Real-Time Socket.IO broadcasts
    const io = req.app.get('io')
    if (io) {
      // 1. User-facing broadcast
      io.emit('transaction:created', transaction)

      // 2. Budget Alert Check
      if (transaction.type === 'expense') {
        await checkBudgetAlerts(io, transaction).catch(() => {})
      }

      // 3. Admin Real-Time Transaction Monitoring Broadcast
      io.to('admin').emit('admin:transaction', {
        action: 'created',
        transactionId: transaction._id,
        user: req.user
          ? { id: req.user._id, name: req.user.name, email: req.user.email }
          : { id: null, name: 'Anonymous', email: 'N/A' },
        title: transaction.title,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        timestamp: new Date().toISOString()
      })

      // 4. Admin Activity Feed
      io.to('admin').emit('admin:activity', {
        type: 'TRANSACTION_CREATED',
        description: `${req.user ? req.user.name : 'User'} added ${transaction.type}: "${transaction.title}" (₹${transaction.amount})`,
        user: req.user ? { id: req.user._id, name: req.user.name, email: req.user.email } : null,
        timestamp: new Date().toISOString()
      })
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

// PUT: Update an existing transaction
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

    const io = req.app.get('io')
    if (io) {
      io.emit('transaction:updated', transaction)

      // Admin Transaction Monitoring Broadcast
      io.to('admin').emit('admin:transaction', {
        action: 'updated',
        transactionId: transaction._id,
        user: req.user
          ? { id: req.user._id, name: req.user.name, email: req.user.email }
          : { id: null, name: 'Anonymous', email: 'N/A' },
        title: transaction.title,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        timestamp: new Date().toISOString()
      })

      // Admin Activity Feed
      io.to('admin').emit('admin:activity', {
        type: 'TRANSACTION_UPDATED',
        description: `${req.user ? req.user.name : 'User'} updated transaction: "${transaction.title}"`,
        user: req.user ? { id: req.user._id, name: req.user.name, email: req.user.email } : null,
        timestamp: new Date().toISOString()
      })
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

    const io = req.app.get('io')
    if (io) {
      io.emit('transaction:deleted', { id: req.params.id })

      // Admin Transaction Monitoring Broadcast
      io.to('admin').emit('admin:transaction', {
        action: 'deleted',
        transactionId: req.params.id,
        user: req.user
          ? { id: req.user._id, name: req.user.name, email: req.user.email }
          : { id: null, name: 'Anonymous', email: 'N/A' },
        title: transaction.title,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        timestamp: new Date().toISOString()
      })

      // Admin Activity Feed
      io.to('admin').emit('admin:activity', {
        type: 'TRANSACTION_DELETED',
        description: `${req.user ? req.user.name : 'User'} deleted transaction "${transaction.title}"`,
        user: req.user ? { id: req.user._id, name: req.user.name, email: req.user.email } : null,
        timestamp: new Date().toISOString()
      })
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
