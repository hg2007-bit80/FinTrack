const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')
const { protect, JWT_SECRET } = require('../middleware/auth')
const { registerValidation, loginValidation } = require('../middleware/validator')

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many requests, please try again later.' }
})

// Token generators
const generateAccessToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' })

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.REFRESH_SECRET || JWT_SECRET + '_refresh', { expiresIn: '7d' })

// POST: /api/auth/register
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const { name, email, password } = req.body
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' })
    }

    // First user can automatically be granted admin role if no other users exist
    const userCount = await User.countDocuments()
    const role = userCount === 0 ? 'admin' : 'user'

    const user = await User.create({
      name,
      email,
      password,
      role,
      lastLogin: new Date(),
      lastActive: new Date()
    })

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)
    user.refreshToken = refreshToken
    await user.save()

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // Broadcast user registered event to admin channel
    const io = req.app.get('io')
    if (io) {
      io.to('admin').emit('admin:activity', {
        type: 'USER_REGISTERED',
        description: `New user registered: ${user.name} (${user.email})`,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        timestamp: new Date().toISOString()
      })
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message })
  }
})

// POST: /api/auth/login
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      })
    }

    user.lastLogin = new Date()
    user.lastActive = new Date()
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)
    user.refreshToken = refreshToken
    await user.save()

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const io = req.app.get('io')
    if (io) {
      io.to('admin').emit('admin:activity', {
        type: 'USER_LOGIN',
        description: `User signed in: ${user.name} (${user.email})`,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        timestamp: new Date().toISOString()
      })
    }

    // If admin logged in, record in AuditLog
    if (user.role === 'admin') {
      await AuditLog.create({
        admin: user._id,
        adminEmail: user.email,
        adminName: user.name,
        action: 'ADMIN_LOGIN',
        targetType: 'System',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || 'Unknown',
        userAgent: req.headers['user-agent'] || 'Unknown'
      }).catch(err => console.error('Failed to write audit log:', err.message))
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message })
  }
})

// POST: /api/auth/setup-admin - Bootstrap an admin account securely
router.post('/setup-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body
    const expectedSecret = process.env.ADMIN_SETUP_KEY || 'fintrack_admin_secret_2026'

    if (secretKey !== expectedSecret) {
      return res.status(403).json({ success: false, message: 'Invalid admin setup key' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    user.role = 'admin'
    user.isActive = true
    await user.save()

    res.status(200).json({
      success: true,
      message: `User ${user.email} promoted to Administrator successfully.`,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Admin setup failed', error: error.message })
  }
})

// POST: /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' })
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET || JWT_SECRET + '_refresh')
    const user = await User.findById(decoded.id)
    if (!user || user.refreshToken !== token || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token or inactive account' })
    }
    const newAccess = generateAccessToken(user._id)
    res.status(200).json({ success: true, token: newAccess })
  } catch (error) {
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid' })
  }
})

// POST: /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    req.user.refreshToken = null
    await req.user.save()
    res.clearCookie('refreshToken')

    const io = req.app.get('io')
    if (io) {
      io.to('admin').emit('admin:activity', {
        type: 'USER_LOGOUT',
        description: `User signed out: ${req.user.name} (${req.user.email})`,
        user: { id: req.user._id, name: req.user.name, email: req.user.email },
        timestamp: new Date().toISOString()
      })
    }

    res.status(200).json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' })
  }
})

// POST: /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link was sent.' })
    }
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    const resetUrl = `${process.env.FRONTEND_URL || 'https://fin-track-seven-rouge.vercel.app'}/reset-password/${resetToken}`

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      })

      await transporter.sendMail({
        from: `"FinTrack" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'FinTrack — Password Reset',
        html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><a href="${resetUrl}">${resetUrl}</a>`
      })
    }

    res.status(200).json({ success: true, message: 'Password reset instructions sent.' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not send reset email', error: error.message })
  }
})

// POST: /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    })
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' })
    }
    user.password = req.body.password
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()
    res.status(200).json({ success: true, message: 'Password reset successful. Please log in.' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Password reset failed', error: error.message })
  }
})

// GET: /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user profile', error: error.message })
  }
})

module.exports = router
