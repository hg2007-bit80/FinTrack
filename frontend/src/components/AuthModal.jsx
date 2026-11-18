import { useState } from 'react'
import { X, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  if (!isOpen) return null

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '' })
    setError('')
    setFieldErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const validate = () => {
    const errs = {}
    if (isRegister && (!formData.name.trim() || formData.name.length < 2)) {
      errs.name = 'Name must be at least 2 characters long'
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please provide a valid email address'
    }
    if (!formData.password || formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (!validate()) return

    try {
      setLoading(true)
      if (isRegister) {
        await register(formData.name.trim(), formData.email.trim(), formData.password)
      } else {
        await login(formData.email.trim(), formData.password)
      }
      handleClose()
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const mapped = {}
        err.errors.forEach((e) => {
          mapped[e.field] = e.message
        })
        setFieldErrors(mapped)
      }
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-[#7657F6]">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isRegister ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isRegister
              ? 'Join FinTrack to manage and track your money'
              : 'Sign in to access your synchronized finances'}
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <UserIcon size={18} />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition ${
                    fieldErrors.name
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#7657F6]'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition ${
                  fieldErrors.email
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#7657F6]'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition ${
                  fieldErrors.password
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#7657F6]'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7657F6] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Processing...</span>
              </>
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
          {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
              setFieldErrors({})
            }}
            className="font-semibold text-[#7657F6] hover:underline"
          >
            {isRegister ? 'Sign In' : 'Sign Up Free'}
          </button>
        </div>
      </div>
    </div>
  )
}
