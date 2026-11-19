const mongoose = require('mongoose')

const recurringSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
      default: 'monthly'
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: 1
    },
    nextRunDate: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastRunDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Recurring', recurringSchema)
