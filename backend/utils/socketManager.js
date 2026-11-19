const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { JWT_SECRET } = require('../middleware/auth')

// In-memory presence tracker: Map<userIdString, Set<socketId>>
const onlineUsers = new Map()

// Helper to get array of online user IDs
const getOnlineUserIds = () => Array.from(onlineUsers.keys())

// Helper to get count of unique online users
const getOnlineUserCount = () => onlineUsers.size

// Setup Socket.IO with authentication and presence tracking
const initSocketServer = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET)
          const user = await User.findById(decoded.id).select('name email role isActive')
          if (user && user.isActive) {
            socket.user = user
          }
        } catch {
          // Token invalid; socket can remain as guest/public connection
        }
      }
      next()
    } catch (err) {
      next()
    }
  })

  io.on('connection', (socket) => {
    const user = socket.user
    const socketId = socket.id

    if (user) {
      const userId = user._id.toString()
      socket.join(`user:${userId}`)

      // If user is admin, join admin monitoring room
      if (user.role === 'admin') {
        socket.join('admin')
      }

      // Track presence
      const isNewLogin = !onlineUsers.has(userId)
      if (isNewLogin) {
        onlineUsers.set(userId, new Set([socketId]))

        // Notify admins that user has come online
        io.to('admin').emit('presence:user_online', {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          timestamp: new Date().toISOString()
        })
      } else {
        onlineUsers.get(userId).add(socketId)
      }

      // Update lastActive timestamp in DB
      User.findByIdAndUpdate(user._id, { lastActive: new Date() }).catch(() => {})
    }

    // Broadcast current presence count to admins
    io.to('admin').emit('presence:count', {
      onlineUsers: onlineUsers.size,
      activeSockets: io.engine.clientsCount || 0
    })

    // Handle client disconnect
    socket.on('disconnect', () => {
      if (user) {
        const userId = user._id.toString()
        const userSockets = onlineUsers.get(userId)

        if (userSockets) {
          userSockets.delete(socketId)
          if (userSockets.size === 0) {
            onlineUsers.delete(userId)

            // Notify admins that user went offline
            io.to('admin').emit('presence:user_offline', {
              userId: user._id,
              email: user.email,
              timestamp: new Date().toISOString()
            })
          }
        }
      }

      // Update admin socket count
      io.to('admin').emit('presence:count', {
        onlineUsers: onlineUsers.size,
        activeSockets: Math.max(0, (io.engine.clientsCount || 1) - 1)
      })
    })
  })

  return {
    getOnlineUserIds,
    getOnlineUserCount
  }
}

module.exports = {
  initSocketServer,
  getOnlineUserIds,
  getOnlineUserCount
}
