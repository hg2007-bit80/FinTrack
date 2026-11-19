const mongoose = require('mongoose')

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Monthly limit is required'],
      min: [1, 'Monthly limit must be greater than 0']
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    },
    alertSent80: {
      type: Boolean,
      default: false
    },
    alertSent100: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

// Unique budget per user per category per month/year
budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true })

module.exports = mongoose.model('Budget', budgetSchema)
