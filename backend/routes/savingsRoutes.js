const express = require('express')
const router = express.Router()
const SavingsGoal = require('../models/SavingsGoal')
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

const goalValidation = [
  body('name').trim().notEmpty().withMessage('Goal name is required'),
  body('targetAmount').isFloat({ min: 1 }).withMessage('Target amount must be > 0'),
  body('targetDate').optional({ checkFalsy: true }).isISO8601().withMessage('Valid target date is required'),
  validate
]

// GET all savings goals
router.get('/', async (req, res) => {
  try {
    const query = {}
    if (req.user) query.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }]
    const goals = await SavingsGoal.find(query).sort({ createdAt: -1 })
    res.status(200).json({ success: true, goals })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST create savings goal
router.post('/', goalValidation, async (req, res) => {
  try {
    const { name, targetAmount, targetDate, color, icon } = req.body
    const finalDate = targetDate && !isNaN(new Date(targetDate).getTime())
      ? new Date(targetDate)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

    const goal = await SavingsGoal.create({
      user: req.user ? req.user._id : null,
      name,
      targetAmount,
      targetDate: finalDate,
      color: color || '#7657F6',
      icon: icon || '🎯'
    })
    res.status(201).json({ success: true, goal })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// PATCH update contribution to a goal
router.patch('/:id/contribute', async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid contribution amount' })
    }
    const goal = await SavingsGoal.findById(req.params.id)
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' })

    goal.currentAmount = Math.min(goal.currentAmount + Number(amount), goal.targetAmount)
    if (goal.currentAmount >= goal.targetAmount) goal.isCompleted = true
    await goal.save()

    // Emit real-time update
    const io = req.app.get('io')
    if (io) io.emit('savings:updated', goal)

    res.status(200).json({ success: true, goal })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE a savings goal
router.delete('/:id', async (req, res) => {
  try {
    await SavingsGoal.findByIdAndDelete(req.params.id)
    res.status(200).json({ success: true, message: 'Goal deleted' })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

module.exports = router
