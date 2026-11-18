const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const dns = require('dns')
const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

dns.setServers(['1.1.1.1', '8.8.8.8'])

const app = express()
const server = http.createServer(app)

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
})

// Attach io instance to express app so routes can broadcast events
app.set('io', io)

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`)

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`)
  })
})

// Middleware
app.use(cors())
app.use(express.json())

// Import routes
const authRoutes = require('./routes/authRoutes')
const transactionRoutes = require('./routes/transactionRoutes')

// Basic / Health routes
app.get('/', (req, res) => {
  res.send('Welcome to FinTrack API with Real-Time & Auth!')
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
app.use('/api/transactions', transactionRoutes)

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  })
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  })
})

// Start server after MongoDB connection
const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected successfully!')

    server.listen(PORT, () => {
      console.log(`FinTrack server running on port ${PORT} with Socket.IO enabled`)
    })
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

startServer()
