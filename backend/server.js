const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const dns = require('dns')
const mongoose = require('mongoose')
const path = require('path')
const cookieParser = require('cookie-parser')
require('dotenv').config({ path: path.join(__dirname, '.env') })

try {
  dns.setServers(['1.1.1.1', '8.8.8.8'])
} catch (err) {
  console.warn('[DNS] Could not set custom DNS servers, using system default:', err.message)
}

const app = express()
const server = http.createServer(app)

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
})

// Attach io instance to express app so routes can broadcast events
app.set('io', io)

// Initialize Socket.IO Authentication & Live Presence Tracker
const { initSocketServer } = require('./utils/socketManager')
initSocketServer(io)

// Middleware
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())
app.use(cookieParser())

// Import routes
const authRoutes = require('./routes/authRoutes')
const transactionRoutes = require('./routes/transactionRoutes')
const adminRoutes = require('./routes/adminRoutes')
const budgetRoutes = require('./routes/budgetRoutes')
const savingsRoutes = require('./routes/savingsRoutes')
const recurringRoutes = require('./routes/recurringRoutes')
const csvRoutes = require('./routes/csvRoutes')
const reportRoutes = require('./routes/reportRoutes')

// Import cron job
const { startCronJobs } = require('./jobs/recurringJob')

// Basic / Health route
app.get('/', (req, res) => {
  res.send('Welcome to FinTrack API with Real-Time, Admin Dashboard & Auth!')
})

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FinTrack Backend is running successfully!',
    status: 'OK',
    socketActive: !!io,
    timestamp: new Date().toISOString()
  })
})

// Route registrations
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/budgets', budgetRoutes)
app.use('/api/savings', savingsRoutes)
app.use('/api/recurring', recurringRoutes)
app.use('/api/csv', csvRoutes)
app.use('/api/reports', reportRoutes)

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.originalUrl}` })
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack)
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' })
})

const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected successfully!')
    server.listen(PORT, () => {
      console.log(`FinTrack server running on port ${PORT} with Socket.IO enabled`)
      startCronJobs(io)
    })
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

startServer()
