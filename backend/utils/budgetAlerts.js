const Transaction = require('../models/transaction')
const Budget = require('../models/Budget')

/**
 * After any transaction is created or deleted,
 * check if any budget thresholds are crossed and emit Socket.IO alerts.
 */
async function checkBudgetAlerts(io, transaction) {
  if (!io || !transaction || transaction.type !== 'expense') return

  const now = new Date(transaction.date || Date.now())
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  try {
    const query = { category: transaction.category, month, year }
    if (transaction.user) query.user = transaction.user

    const budget = await Budget.findOne(query)
    if (!budget) return

    // Calculate current total spending for this category/month
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const txQuery = { type: 'expense', category: transaction.category, date: { $gte: start, $lte: end } }
    if (transaction.user) {
      txQuery.$or = [{ user: transaction.user }, { user: null }, { user: { $exists: false } }]
    }

    const transactions = await Transaction.find(txQuery)
    const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
    const percentage = (spent / budget.monthlyLimit) * 100

    // 80% alert
    if (percentage >= 80 && percentage < 100 && !budget.alertSent80) {
      io.emit('budget:alert', {
        category: transaction.category,
        spent,
        limit: budget.monthlyLimit,
        percentage: Math.round(percentage),
        type: 'warning',
        message: `⚠️ You've used ${Math.round(percentage)}% of your ${transaction.category} budget this month!`
      })
      budget.alertSent80 = true
      await budget.save()
    }

    // 100% alert (exceeded)
    if (percentage >= 100 && !budget.alertSent100) {
      io.emit('budget:alert', {
        category: transaction.category,
        spent,
        limit: budget.monthlyLimit,
        percentage: Math.round(percentage),
        type: 'exceeded',
        message: `🚨 Budget exceeded for ${transaction.category}! You've spent ₹${spent.toFixed(0)} of your ₹${budget.monthlyLimit} limit.`
      })
      budget.alertSent100 = true
      await budget.save()
    }
  } catch (err) {
    console.error('[BudgetAlert] Error checking budget:', err.message)
  }
}

module.exports = { checkBudgetAlerts }
