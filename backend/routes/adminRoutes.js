const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = require('../models/User')
const Transaction = require('../models/transaction')
const AuditLog = require('../models/AuditLog')
const SystemConfig = require('../models/SystemConfig')
const { protect, adminOnly } = require('../middleware/auth')
const { getOnlineUserCount, getOnlineUserIds } = require('../utils/socketManager')

// Protect all admin routes with JWT auth and Admin role check
router.use(protect)
router.use(adminOnly)

// Helper to record audit log
const recordAudit = async (req, action, targetType, targetId, targetEmail, details = {}) => {
  try {
    await AuditLog.create({
      admin: req.user._id,
      adminEmail: req.user.email,
      adminName: req.user.name,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : null,
      targetEmail,
      details,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown'
    })
  } catch (err) {
    console.error('AuditLog error:', err.message)
  }
}

// -------------------------------------------------------------
// 1. OVERVIEW: Real-Time Admin Statistics
// -------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const io = req.app.get('io')

    // Today's start boundary
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    // Aggregate User Stats
    const [totalUsers, activeUsersCount, newUsersToday] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } })
    ])

    // Aggregate Transaction Stats
    const [txStats, txTodayCount] = await Promise.all([
      Transaction.aggregate([
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.countDocuments({ createdAt: { $gte: startOfToday } })
    ])

    let totalTransactions = 0
    let totalIncome = 0
    let totalExpenses = 0

    txStats.forEach((stat) => {
      totalTransactions += stat.count
      if (stat._id === 'income') totalIncome = stat.totalAmount
      if (stat._id === 'expense') totalExpenses = stat.totalAmount
    })

    // Socket Connections
    const onlineUsersCount = getOnlineUserCount()
    const activeSockets = io ? io.engine.clientsCount || 0 : 0

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsersCount,
        newUsersToday,
        totalTransactions,
        totalIncome,
        totalExpenses,
        transactionsToday: txTodayCount,
        onlineUsersCount,
        activeSockets,
        netBalance: totalIncome - totalExpenses
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message })
  }
})

// -------------------------------------------------------------
// 2. ANALYTICS: Charts & Trends Data
// -------------------------------------------------------------
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // 1. Daily User Registrations (Last 7 days)
    const userTrends = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // 2. Daily Transaction Activity (Volume & Amount last 7 days)
    const transactionTrends = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ])

    // Format daily transactions for multi-bar / line charts
    const dailyMap = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
      dailyMap[dateStr] = { date: label, rawDate: dateStr, income: 0, expenses: 0, count: 0, newUsers: 0 }
    }

    userTrends.forEach((u) => {
      if (dailyMap[u._id]) {
        dailyMap[u._id].newUsers = u.count
      }
    })

    transactionTrends.forEach((t) => {
      const dateKey = t._id.date
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].count += t.count
        if (t._id.type === 'income') dailyMap[dateKey].income += t.totalAmount
        if (t._id.type === 'expense') dailyMap[dateKey].expenses += t.totalAmount
      }
    })

    // 3. Category Breakdown for All Expenses
    const categoryStats = await Transaction.aggregate([
      { $match: { type: 'expense' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ])

    res.status(200).json({
      success: true,
      data: {
        dailyTrends: Object.values(dailyMap),
        categoryBreakdown: categoryStats.map((c) => ({
          name: c._id || 'Others',
          value: c.total,
          count: c.count
        }))
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message })
  }
})

// -------------------------------------------------------------
// 3. USER MANAGEMENT: List, Filter, Details, Status, Delete
// -------------------------------------------------------------

// GET: All users with search & filters
router.get('/users', async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query
    const filter = {}

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    if (role) filter.role = role
    if (status !== undefined && status !== '') {
      filter.isActive = status === 'active' || status === 'true'
    }

    const onlineUserIds = new Set(getOnlineUserIds())

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshToken -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ])

    const formattedUsers = users.map((u) => ({
      ...u.toObject(),
      isOnline: onlineUserIds.has(u._id.toString())
    }))

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      users: formattedUsers
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message })
  }
})

// GET: User details with transaction summary
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -refreshToken -resetPasswordToken -resetPasswordExpires'
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Aggregate user transaction stats
    const stats = await Transaction.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])

    let totalIncome = 0
    let totalExpense = 0
    let transactionCount = 0

    stats.forEach((s) => {
      transactionCount += s.count
      if (s._id === 'income') totalIncome = s.totalAmount
      if (s._id === 'expense') totalExpense = s.totalAmount
    })

    const recentTransactions = await Transaction.find({ user: user._id })
      .sort({ date: -1 })
      .limit(5)

    const onlineUserIds = new Set(getOnlineUserIds())

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        isOnline: onlineUserIds.has(user._id.toString()),
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        transactionCount,
        recentTransactions
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user details', error: error.message })
  }
})

// PATCH: Activate / Deactivate User Account
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body
    const targetUserId = req.params.id

    // Self-modification protection
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot activate or deactivate your own administrator account.'
      })
    }

    const user = await User.findById(targetUserId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    user.isActive = Boolean(isActive)
    await user.save()

    const action = user.isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE'
    await recordAudit(req, action, 'User', user._id, user.email, {
      previousStatus: !user.isActive,
      newStatus: user.isActive
    })

    const io = req.app.get('io')
    if (io) {
      // Notify admin room
      io.to('admin').emit('admin:activity', {
        type: action,
        description: `Admin ${req.user.name} ${user.isActive ? 'activated' : 'deactivated'} user ${user.name} (${user.email})`,
        admin: { id: req.user._id, name: req.user.name },
        targetUser: { id: user._id, email: user.email },
        timestamp: new Date().toISOString()
      })

      // If user was deactivated, notify the user socket to log them out
      if (!user.isActive) {
        io.to(`user:${user._id.toString()}`).emit('user:deactivated', {
          message: 'Your account has been deactivated by an administrator.'
        })
      }
    }

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user status', error: error.message })
  }
})

// DELETE: Remove User Account
router.delete('/users/:id', async (req, res) => {
  try {
    const targetUserId = req.params.id

    // Self-deletion protection
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot delete your own administrator account.'
      })
    }

    const user = await User.findById(targetUserId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const deletedEmail = user.email
    const deletedName = user.name

    await User.findByIdAndDelete(targetUserId)

    await recordAudit(req, 'USER_DELETE', 'User', targetUserId, deletedEmail, {
      deletedName,
      deletedRole: user.role
    })

    const io = req.app.get('io')
    if (io) {
      io.to(`user:${targetUserId}`).emit('user:deleted', {
        message: 'Your account has been permanently removed by an administrator.'
      })

      io.to('admin').emit('admin:activity', {
        type: 'USER_DELETE',
        description: `Admin ${req.user.name} deleted user ${deletedName} (${deletedEmail})`,
        admin: { id: req.user._id, name: req.user.name },
        timestamp: new Date().toISOString()
      })
    }

    res.status(200).json({
      success: true,
      message: `User ${deletedName} (${deletedEmail}) deleted successfully.`
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message })
  }
})

// -------------------------------------------------------------
// 4. BROADCAST NOTIFICATIONS
// -------------------------------------------------------------
router.post('/broadcast', async (req, res) => {
  try {
    const { target, targetId, title, message, type = 'info' } = req.body

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' })
    }

    const io = req.app.get('io')
    const payload = {
      id: Date.now().toString(),
      title,
      message,
      type, // 'info' | 'warning' | 'alert'
      sender: req.user.name,
      timestamp: new Date().toISOString()
    }

    if (target === 'user' && targetId) {
      // Send to specific user room
      if (io) {
        io.to(`user:${targetId}`).emit('notification:broadcast', payload)
      }
    } else {
      // Send to all connected users
      if (io) {
        io.emit('notification:broadcast', payload)
      }
    }

    await recordAudit(req, 'BROADCAST_NOTIFICATION', 'Broadcast', targetId || 'ALL', null, {
      title,
      target,
      type
    })

    res.status(200).json({
      success: true,
      message: `Notification broadcasted to ${target === 'user' ? 'specified user' : 'all connected users'} successfully.`,
      notification: payload
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to broadcast notification', error: error.message })
  }
})

// -------------------------------------------------------------
// 5. SYSTEM MONITORING: Health, Memory, Uptime, DB Status
// -------------------------------------------------------------
router.get('/system', async (req, res) => {
  try {
    const io = req.app.get('io')
    const memoryUsage = process.memoryUsage()

    const systemInfo = {
      status: 'HEALTHY',
      serverUptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMB: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2)
      },
      database: {
        state: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        dbName: mongoose.connection.name || 'fintrack',
        host: mongoose.connection.host || 'MongoDB Atlas'
      },
      socket: {
        status: io ? 'ACTIVE' : 'INACTIVE',
        activeClients: io ? io.engine.clientsCount || 0 : 0,
        onlineUsersCount: getOnlineUserCount()
      },
      timestamp: new Date().toISOString()
    }

    res.status(200).json({ success: true, system: systemInfo })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch system telemetry', error: error.message })
  }
})

// -------------------------------------------------------------
// 6. MAINTENANCE MODE CONTROLS
// -------------------------------------------------------------
router.get('/maintenance', async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ key: 'system_settings' })
    if (!config) {
      config = await SystemConfig.create({ key: 'system_settings', maintenanceMode: false })
    }
    res.status(200).json({ success: true, config })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance status', error: error.message })
  }
})

router.post('/maintenance', async (req, res) => {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body

    let config = await SystemConfig.findOne({ key: 'system_settings' })
    if (!config) {
      config = new SystemConfig({ key: 'system_settings' })
    }

    config.maintenanceMode = Boolean(maintenanceMode)
    if (maintenanceMessage) config.maintenanceMessage = maintenanceMessage
    config.updatedBy = req.user._id
    config.lastUpdated = new Date()
    await config.save()

    const action = config.maintenanceMode ? 'MAINTENANCE_MODE_ON' : 'MAINTENANCE_MODE_OFF'
    await recordAudit(req, action, 'System', null, null, {
      maintenanceMode: config.maintenanceMode,
      message: config.maintenanceMessage
    })

    // Instant Socket.IO push to all connected users
    const io = req.app.get('io')
    if (io) {
      io.emit('system:maintenance', {
        maintenanceMode: config.maintenanceMode,
        message: config.maintenanceMessage,
        updatedAt: config.lastUpdated
      })

      io.to('admin').emit('admin:activity', {
        type: action,
        description: `Maintenance mode turned ${config.maintenanceMode ? 'ON' : 'OFF'} by ${req.user.name}`,
        admin: { id: req.user._id, name: req.user.name },
        timestamp: new Date().toISOString()
      })
    }

    res.status(200).json({
      success: true,
      message: `Maintenance mode ${config.maintenanceMode ? 'enabled' : 'disabled'} successfully.`,
      config
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update maintenance mode', error: error.message })
  }
})

// -------------------------------------------------------------
// 7. AUDIT LOGS: Query & History
// -------------------------------------------------------------
router.get('/audit-logs', async (req, res) => {
  try {
    const { action, limit = 50, page = 1 } = req.query
    const filter = {}
    if (action) filter.action = action

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter)
    ])

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      logs
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message })
  }
})

// -------------------------------------------------------------
// 8. RECENT ACTIVITY FEED
// -------------------------------------------------------------
router.get('/activity', async (req, res) => {
  try {
    // Combine recent transactions and recent audit events
    const [recentTx, recentAudit] = await Promise.all([
      Transaction.find()
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(15),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(15)
    ])

    const activities = []

    recentTx.forEach((tx) => {
      activities.push({
        id: tx._id,
        type: `TRANSACTION_${tx.type.toUpperCase()}`,
        description: `${tx.user ? tx.user.name : 'User'} recorded ${tx.type}: "${tx.title}" (₹${tx.amount})`,
        category: tx.category,
        amount: tx.amount,
        user: tx.user ? { name: tx.user.name, email: tx.user.email } : null,
        timestamp: tx.createdAt || tx.date
      })
    })

    recentAudit.forEach((log) => {
      activities.push({
        id: log._id,
        type: log.action,
        description: `Admin action: ${log.action} performed by ${log.adminName || log.adminEmail}`,
        user: { name: log.adminName, email: log.adminEmail },
        details: log.details,
        timestamp: log.createdAt
      })
    })

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.status(200).json({
      success: true,
      activities: activities.slice(0, 20)
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch activity feed', error: error.message })
  }
})

module.exports = router
