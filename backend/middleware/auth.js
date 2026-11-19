const jwt = require('jsonwebtoken')
const User = require('../models/User')
const SystemConfig = require('../models/SystemConfig')

const JWT_SECRET = process.env.JWT_SECRET || 'fintrack_jwt_secret_key_2026'

// Protect middleware: requires valid JWT & active account
const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, please log in'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists'
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by an administrator. Please contact support.'
      })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    })
  }
}

// Admin only authorization middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required.'
    })
  }
  next()
}

// Optional auth middleware: attaches user if token is present, continues otherwise
const optionalAuth = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (user && user.isActive) {
      req.user = user
    }
  } catch {
    // Continue without user if token is invalid
  }

  next()
}

// Maintenance Mode Enforcement Middleware
// Blocks write/sensitive operations for non-admins when maintenance mode is active
const checkMaintenance = async (req, res, next) => {
  try {
    // Skip GET requests or health checks
    if (req.method === 'GET' || req.path === '/api/health' || req.path.startsWith('/api/admin')) {
      return next()
    }

    const config = await SystemConfig.findOne({ key: 'system_settings' })
    if (config && config.maintenanceMode) {
      // If user is authenticated and is an admin, allow through
      if (req.user && req.user.role === 'admin') {
        return next()
      }

      return res.status(503).json({
        success: false,
        maintenance: true,
        message: config.maintenanceMessage || 'FinTrack is currently undergoing scheduled maintenance.'
      })
    }
    next()
  } catch (error) {
    next()
  }
}

module.exports = {
  protect,
  adminOnly,
  optionalAuth,
  checkMaintenance,
  JWT_SECRET
}
