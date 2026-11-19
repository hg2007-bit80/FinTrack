const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    adminEmail: {
      type: String,
      required: true
    },
    adminName: {
      type: String,
      default: ''
    },
    action: {
      type: String,
      required: true,
      enum: [
        'ADMIN_LOGIN',
        'USER_ACTIVATE',
        'USER_DEACTIVATE',
        'USER_DELETE',
        'USER_ROLE_CHANGE',
        'BROADCAST_NOTIFICATION',
        'MAINTENANCE_MODE_ON',
        'MAINTENANCE_MODE_OFF',
        'SYSTEM_SETTINGS_UPDATE'
      ],
      index: true
    },
    targetType: {
      type: String,
      enum: ['User', 'System', 'Broadcast', 'Transaction'],
      default: 'System'
    },
    targetId: {
      type: String,
      default: null
    },
    targetEmail: {
      type: String,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    }
  },
  {
    timestamps: true
  }
)

auditLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('AuditLog', auditLogSchema)
