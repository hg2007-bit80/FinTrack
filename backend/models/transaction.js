const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },

    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true
    },

    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0.01, 'Amount must be greater than 0']
    },

    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: '{VALUE} is not a valid transaction type'
      },
      required: [true, 'Please specify transaction type']
    },

    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true
    },

    description: {
      type: String,
      default: '',
      trim: true
    },

    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Transaction', transactionSchema)
