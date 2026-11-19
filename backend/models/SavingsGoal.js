const mongoose = require('mongoose')

const savingsGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target must be greater than 0']
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required']
    },
    color: {
      type: String,
      default: '#7657F6'
    },
    icon: {
      type: String,
      default: '🎯'
    },
    isCompleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema)
