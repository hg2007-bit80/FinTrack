const express = require('express')
const router = express.Router()
const Recurring = require('../models/Recurring')
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

const recurringValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be > 0'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('frequency').isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid frequency'),
  body('dayOfMonth').optional().isInt({ min: 1, max: 31 }),
  validate
]

function getNextRunDate(frequency, dayOfMonth = 1) {
  const now = new Date()
  let next = new Date()

  if (frequency === 'daily') {
    next.setDate(now.getDate() + 1)
  } else if (frequency === 'weekly') {
    next.setDate(now.getDate() + 7)
  } else if (frequency === 'monthly') {
    next = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth)
  } else if (frequency === 'yearly') {
    next = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  }

  return next
}

// GET all recurring transactions
router.get('/', async (req, res) => {
  try {
    const query = {}
    if (req.user) query.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    const recurring = await Recurring.find(query).sort({ nextRunDate: 1 })
    res.status(200).json({ success: true, recurring })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create a recurring transaction rule
router.post('/', recurringValidation, async (req, res) => {
  try {
    const { title, amount, type, category, description, frequency, dayOfMonth } = req.body

    const nextRunDate = getNextRunDate(frequency, dayOfMonth || 1)

    const recurring = await Recurring.create({
      user: req.user ? req.user._id : null,
      title, amount, type, category,
      description: description || '',
      frequency,
      dayOfMonth: dayOfMonth || 1,
      nextRunDate
    })

    res.status(201).json({ success: true, message: 'Recurring transaction created', recurring })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// PATCH toggle active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const recurring = await Recurring.findById(req.params.id)
    if (!recurring) return res.status(404).json({ success: false, message: 'Not found' })
    recurring.isActive = !recurring.isActive
    await recurring.save()
    res.status(200).json({ success: true, recurring })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE a recurring rule
router.delete('/:id', async (req, res) => {
  try {
    await Recurring.findByIdAndDelete(req.params.id)
    res.status(200).json({ success: true, message: 'Recurring rule deleted' })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

module.exports = router
