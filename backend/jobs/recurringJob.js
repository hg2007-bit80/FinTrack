const cron = require('node-cron')
const Recurring = require('../models/Recurring')
const Transaction = require('../models/transaction')

function getNextRunDate(frequency, dayOfMonth = 1, fromDate = new Date()) {
  const next = new Date(fromDate)

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else if (frequency === 'monthly') {
    const nextMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, dayOfMonth)
    return nextMonth
  } else if (frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
  }

  return next
}

async function processRecurringTransactions(io) {
  const now = new Date()
  const dueItems = await Recurring.find({
    isActive: true,
    nextRunDate: { $lte: now }
  })

  if (dueItems.length > 0) {
    console.log(`[Cron] Processing ${dueItems.length} recurring transaction(s)`)
  }

  for (const rule of dueItems) {
    try {
      const transaction = await Transaction.create({
        user: rule.user,
        title: rule.title,
        amount: rule.amount,
        type: rule.type,
        category: rule.category,
        description: `Auto-generated: ${rule.frequency} recurring — ${rule.description || ''}`.trim(),
        date: now
      })

      // Update next run date and lastRunDate
      rule.lastRunDate = now
      rule.nextRunDate = getNextRunDate(rule.frequency, rule.dayOfMonth, now)
      await rule.save()

      // Broadcast in real-time
      if (io) {
        io.emit('transaction:created', transaction)
        io.emit('recurring:fired', {
          ruleId: rule._id,
          title: rule.title,
          amount: rule.amount,
          type: rule.type,
          nextRunDate: rule.nextRunDate
        })
      }

      console.log(`[Cron] ✅ Created recurring transaction: "${rule.title}" (${rule.type}) ₹${rule.amount}`)
    } catch (err) {
      console.error(`[Cron] ❌ Failed to process recurring rule "${rule.title}":`, err.message)
    }
  }
}

function startCronJobs(io) {
  // Run every hour at minute 0 — checks for due recurring transactions
  cron.schedule('0 * * * *', () => {
    console.log('[Cron] ⏰ Running recurring transaction scheduler...')
    processRecurringTransactions(io)
  })

  // Also run at startup to process any overdue items (useful after server restart)
  setTimeout(() => processRecurringTransactions(io), 5000)

  console.log('[Cron] ✅ Recurring transaction scheduler started (runs every hour)')
}

module.exports = { startCronJobs, processRecurringTransactions }
