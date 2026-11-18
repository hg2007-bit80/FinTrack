import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getTransactions,
  addTransaction as apiAddTransaction,
  updateTransaction as apiUpdateTransaction,
  deleteTransaction as apiDeleteTransaction
} from '../services/transactionService'
import { useAuth } from './AuthContext'
import { useSocket } from './SocketContext'

const TransactionContext = createContext(null)

const formatTransaction = (transaction) => ({
  id: transaction._id,
  name: transaction.title,
  category: transaction.category,
  date: new Date(transaction.date || transaction.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }),
  rawDate: transaction.date || transaction.createdAt,
  amount: Number(transaction.amount),
  type: transaction.type,
  description: transaction.description || ''
})

export const TransactionProvider = ({ children }) => {
  const { user } = useAuth()
  const socketContext = useSocket()
  const socket = socketContext?.socket

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getTransactions()
      if (response && response.transactions) {
        setTransactions(response.transactions.map(formatTransaction))
      }
    } catch (err) {
      setError(err.message || 'Could not load transactions from the database.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Refetch when user changes (login / logout)
  useEffect(() => {
    fetchTransactions()
  }, [user, fetchTransactions])

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!socket) return

    const handleCreated = (newTx) => {
      const formatted = formatTransaction(newTx)
      setTransactions((prev) => {
        // Prevent duplicate if already added locally
        if (prev.some((t) => t.id === formatted.id)) return prev
        return [formatted, ...prev]
      })
    }

    const handleUpdated = (updatedTx) => {
      const formatted = formatTransaction(updatedTx)
      setTransactions((prev) =>
        prev.map((t) => (t.id === formatted.id ? formatted : t))
      )
    }

    const handleDeleted = ({ id }) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }

    socket.on('transaction:created', handleCreated)
    socket.on('transaction:updated', handleUpdated)
    socket.on('transaction:deleted', handleDeleted)

    return () => {
      socket.off('transaction:created', handleCreated)
      socket.off('transaction:updated', handleUpdated)
      socket.off('transaction:deleted', handleDeleted)
    }
  }, [socket])

  const createTransaction = async (txData) => {
    const res = await apiAddTransaction(txData)
    const formatted = formatTransaction(res.transaction)
    setTransactions((prev) => {
      if (prev.some((t) => t.id === formatted.id)) return prev
      return [formatted, ...prev]
    })
    return res
  }

  const editTransaction = async (id, txData) => {
    const res = await apiUpdateTransaction(id, txData)
    const formatted = formatTransaction(res.transaction)
    setTransactions((prev) =>
      prev.map((t) => (t.id === formatted.id ? formatted : t))
    )
    return res
  }

  const removeTransaction = async (id) => {
    await apiDeleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  // Calculated Metrics
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = income - expenses
  const savings = balance

  const expenseData = Object.values(
    transactions
      .filter((t) => t.type === 'expense')
      .reduce((groups, t) => {
        const cat = t.category || 'Others'
        groups[cat] = groups[cat] || { name: cat, value: 0 }
        groups[cat].value += t.amount
        return groups
      }, {})
  )

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
        error,
        income,
        expenses,
        balance,
        savings,
        expenseData,
        createTransaction,
        editTransaction,
        removeTransaction,
        refresh: fetchTransactions
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}

export const useTransactions = () => {
  const context = useContext(TransactionContext)
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider')
  }
  return context
}
