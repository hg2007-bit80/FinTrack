import { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { AlertTriangle, X } from 'lucide-react'

export default function BudgetAlert() {
  const { socket } = useSocket()
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!socket) return
    const handler = (data) => {
      const id = Date.now()
      setAlerts((prev) => [...prev, { ...data, id }])
      setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 6000)
    }
    socket.on('budget:alert', handler)
    return () => socket.off('budget:alert', handler)
  }, [socket])

  if (!alerts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl animate-fade-in ${
            alert.type === 'exceeded'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {alert.type === 'exceeded' ? '🚨 Budget Exceeded!' : '⚠️ Budget Warning'}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {alert.category}: {Math.round(alert.percent)}% used
              {alert.type === 'warning' ? ' — approaching limit' : ' — limit exceeded!'}
            </p>
          </div>
          <button
            onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
            className="rounded-lg p-1 hover:bg-black/10 transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
