import { useState, useEffect } from 'react'
import {
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  X,
  Wallet,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage({ isModal = false, onClose, initialPortal = 'client', onAuthSuccess }) {
  const { login, register, registerAdmin } = useAuth()

  // Portal selection: 'client' | 'admin'
  const [portal, setPortal] = useState(initialPortal)
  const [isRegister, setIsRegister] = useState(false)

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setPortal(initialPortal)
  }, [initialPortal])

  // Clear errors when toggling portal or mode
  const handlePortalChange = (newPortal) => {
    setPortal(newPortal)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')
  }

  const handleModeToggle = (registerMode) => {
    setIsRegister(registerMode)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')
  }

  const validate = () => {
    const errs = {}

    if (isRegister) {
      if (!formData.name.trim() || formData.name.length < 2) {
        errs.name = 'Full name must be at least 2 characters'
      }
    }

    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please provide a valid email address'
    }

    if (!formData.password || formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }

    if (isRegister) {
      if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match'
      }
    }

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSuccessMessage('')

    if (!validate()) return

    setLoading(true)

    try {
      if (isRegister) {
        if (portal === 'admin') {
          // Admin registration
          const res = await registerAdmin(
            formData.name.trim(),
            formData.email.trim(),
            formData.password
          )
          setSuccessMessage('Administrator account created! Redirecting to Admin Dashboard...')
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess('admin')
            } else {
              window.history.pushState({}, '', '/admin')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }, 800)
        } else {
          // Client registration (strictly assigned 'user' role)
          const res = await register(
            formData.name.trim(),
            formData.email.trim(),
            formData.password
          )
          setSuccessMessage('Account created successfully! Redirecting to Dashboard...')
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess('client')
            } else {
              window.history.pushState({}, '', '/dashboard')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }, 800)
        }
      } else {
        // Sign in with portal verification
        const res = await login(formData.email.trim(), formData.password, portal)
        
        if (portal === 'admin' && res.user.role === 'admin') {
          setSuccessMessage('Administrator authenticated! Opening Admin Dashboard...')
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess('admin')
            } else {
              window.history.pushState({}, '', '/admin')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }, 600)
        } else {
          setSuccessMessage('Welcome back! Loading your dashboard...')
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess('client')
            } else {
              window.history.pushState({}, '', '/dashboard')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }, 600)
        }
      }
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const mapped = {}
        err.errors.forEach((e) => {
          mapped[e.field] = e.message
        })
        setFieldErrors(mapped)
      }
      setError(
        err.response?.data?.message ||
          err.message ||
          'Authentication failed. Please check your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl transition-all">
      {/* Modal Close Button */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-6 top-6 rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <X size={18} />
        </button>
      )}

      {/* Brand Header */}
      <div className="text-center">
        <div
          className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            portal === 'admin'
              ? 'bg-purple-100 text-[#7657F6]'
              : 'bg-blue-100 text-[#3985F7]'
          }`}
        >
          {portal === 'admin' ? <ShieldCheck size={28} /> : <Wallet size={28} />}
        </div>

        <h1 className="text-2xl font-bold text-[#20243A]">
          FinTrack<span className="text-[#7657F6]">.</span>
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          {portal === 'admin'
            ? 'Administrative Control & Real-Time Monitoring Portal'
            : 'Personal Finance, Budgeting & Smart Wealth Management'}
        </p>
      </div>

      {/* PORTAL SELECTOR DROPDOWN */}
      <div className="mt-6">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
          Select Your Portal
        </label>
        <div className="relative">
          <select
            value={portal}
            onChange={(e) => handlePortalChange(e.target.value)}
            className="w-full appearance-none rounded-2xl border-2 border-gray-200 bg-gray-50/60 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition hover:border-gray-300 focus:border-[#7657F6] focus:bg-white cursor-pointer pr-10"
          >
            <option value="client">👤 Client Portal (Personal Dashboard)</option>
            <option value="admin">🛡️ Admin Portal (Administrative Dashboard)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500">
            <ChevronDown size={18} />
          </div>
        </div>

        {/* Portal Info Badge */}
        <div
          className={`mt-2 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${
            portal === 'admin'
              ? 'bg-purple-50 text-[#7657F6] border border-purple-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              portal === 'admin' ? 'bg-[#7657F6]' : 'bg-blue-500'
            }`}
          />
          <span>
            {portal === 'admin'
              ? 'Authorized Administrator access only (/admin)'
              : 'Standard Client Account (/dashboard)'}
          </span>
        </div>
      </div>

      {/* SIGN IN / SIGN UP TABS */}
      <div className="mt-5 flex rounded-2xl bg-gray-100 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleModeToggle(false)}
          className={`flex-1 rounded-xl py-2 transition ${
            !isRegister
              ? 'bg-white text-[#7657F6] shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {portal === 'admin' ? 'Admin Sign In' : 'Client Sign In'}
        </button>
        <button
          type="button"
          onClick={() => handleModeToggle(true)}
          className={`flex-1 rounded-xl py-2 transition ${
            isRegister
              ? 'bg-white text-[#7657F6] shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {portal === 'admin' ? 'Register Admin' : 'Create Account'}
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
        {/* Full Name for Registration */}
        {isRegister && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <UserIcon size={17} />
              </span>
              <input
                type="text"
                placeholder={portal === 'admin' ? 'Admin Name' : 'Jane Doe'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-xs outline-none transition ${
                  fieldErrors.name
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#7657F6]'
                }`}
              />
            </div>
            {fieldErrors.name && (
              <p className="mt-1 text-[11px] text-red-500">{fieldErrors.name}</p>
            )}
          </div>
        )}

        {/* Email Address */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              <Mail size={17} />
            </span>
            <input
              type="email"
              placeholder={portal === 'admin' ? 'admin@fintrack.com' : 'you@example.com'}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-xs outline-none transition ${
                fieldErrors.email
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-[#7657F6]'
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1 text-[11px] text-red-500">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              <Lock size={17} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="•••••••• (min 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-xs outline-none transition ${
                fieldErrors.password
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-[#7657F6]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-[11px] text-red-500">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password for Registration */}
        {isRegister && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock size={17} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="•••••••• (re-enter password)"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-xs outline-none transition ${
                  fieldErrors.confirmPassword
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#7657F6]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-[11px] text-red-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>
        )}


        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7657F6] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={17} />
              <span>Verifying {portal === 'admin' ? 'Admin' : 'Client'} Access...</span>
            </>
          ) : (
            <>
              <span>
                {isRegister
                  ? portal === 'admin'
                    ? 'Register Administrator'
                    : 'Create Client Account'
                  : portal === 'admin'
                  ? 'Sign In to Admin Portal'
                  : 'Sign In to Client Portal'}
              </span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer Switcher */}
      <div className="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
        {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
        <button
          type="button"
          onClick={() => handleModeToggle(!isRegister)}
          className="font-semibold text-[#7657F6] hover:underline"
        >
          {isRegister ? 'Sign In Instead' : 'Register Here'}
        </button>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
        {content}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] p-4">
      {content}
    </div>
  )
}
