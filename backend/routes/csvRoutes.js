const express = require('express')
const router = express.Router()
const multer = require('multer')
const Papa = require('papaparse')
const Transaction = require('../models/transaction')
const { optionalAuth } = require('../middleware/auth')

router.use(optionalAuth)

// Multer: memory storage for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(csv|txt)$/i)) {
      return cb(new Error('Only CSV files are allowed'), false)
    }
    cb(null, true)
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
})

// Auto-categorization keyword rules
const CATEGORY_RULES = [
  { keywords: ['swiggy', 'zomato', 'uber eats', 'food', 'restaurant', 'cafe', 'eat'], category: 'Food' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shop', 'store', 'mall'], category: 'Shopping' },
  { keywords: ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'fuel', 'petrol'], category: 'Transport' },
  { keywords: ['electricity', 'water', 'gas', 'broadband', 'wifi', 'internet', 'bill', 'recharge'], category: 'Bills' },
  { keywords: ['netflix', 'amazon prime', 'hotstar', 'spotify', 'movie', 'cinema', 'concert', 'gaming'], category: 'Entertainment' },
  { keywords: ['salary', 'payroll', 'wages', 'freelance', 'bonus', 'income'], category: 'Income' }
]

function autoCategory(description = '') {
  const lower = description.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.category
    }
  }
  return 'Others'
}

// POST /api/csv/import — Upload and import CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' })
    }

    const csvText = req.file.buffer.toString('utf-8')
    const { data, errors } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_')
    })

    if (errors.length > 0 && data.length === 0) {
      return res.status(400).json({ success: false, message: 'Could not parse CSV file' })
    }

    const created = []
    const skipped = []

    for (const row of data) {
      // Try to map common bank statement column names
      const title = row.description || row.narration || row.particulars || row.remarks || row.title || 'Imported'
      const amount = Math.abs(parseFloat(row.amount || row.debit || row.credit || row.withdrawal || 0))
      const rawDate = row.date || row.transaction_date || row.value_date || new Date().toISOString()

      // Determine type from debit/credit columns
      let type = 'expense'
      if (row.credit && parseFloat(row.credit) > 0) type = 'income'
      else if (row.type) type = String(row.type).toLowerCase().includes('credit') ? 'income' : 'expense'

      const category = autoCategory(String(title))

      if (!amount || amount <= 0) {
        skipped.push({ row, reason: 'Invalid amount' })
        continue
      }

      const tx = await Transaction.create({
        user: req.user ? req.user._id : null,
        title: String(title).trim().substring(0, 100),
        amount,
        type,
        category,
        description: `Imported from CSV`,
        date: new Date(rawDate) || new Date()
      })
      created.push(tx)
    }

    // Real-time broadcast
    const io = req.app.get('io')
    if (io && created.length > 0) {
      io.emit('transactions:bulkCreated', { count: created.length })
    }

    res.status(200).json({
      success: true,
      message: `Imported ${created.length} transactions (${skipped.length} skipped)`,
      imported: created.length,
      skipped: skipped.length
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/csv/export — Export all transactions as CSV
router.get('/export', async (req, res) => {
  try {
    const query = {}
    if (req.user) {
      query.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    }
    if (req.query.type) query.type = req.query.type
    if (req.query.startDate) query.date = { $gte: new Date(req.query.startDate) }
    if (req.query.endDate) {
      query.date = { ...query.date, $lte: new Date(req.query.endDate) }
    }

    const transactions = await Transaction.find(query).sort({ date: -1 })

    const rows = transactions.map(t => ({
      Date: new Date(t.date).toLocaleDateString('en-IN'),
      Title: t.title,
      Amount: t.amount,
      Type: t.type,
      Category: t.category,
      Description: t.description || ''
    }))

    // Manual CSV generation (without json2csv)
    const headers = Object.keys(rows[0] || { Date: '', Title: '', Amount: '', Type: '', Category: '', Description: '' })
    const csvLines = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
    ]
    const csv = csvLines.join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=fintrack-export-${Date.now()}.csv`)
    res.status(200).send(csv)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
