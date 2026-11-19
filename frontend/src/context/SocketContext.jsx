import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { API_URL, getAuthToken } from '../services/api'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [activeSockets, setActiveSockets] = useState(0)
  const [maintenance, setMaintenance] = useState({ active: false, message: '' })
  const [broadcastAlert, setBroadcastAlert] = useState(null)

  useEffect(() => {
    const token = getAuthToken()
    const socketInstance = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to real-time server with ID:', socketInstance.id)
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from real-time server')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.warn('[Socket.IO] Connection error:', error.message)
      setIsConnected(false)
    })

    // Listen for real-time presence counts
    socketInstance.on('presence:count', (data) => {
      if (data.onlineUsers !== undefined) setOnlineCount(data.onlineUsers)
      if (data.activeSockets !== undefined) setActiveSockets(data.activeSockets)
    })

    // Listen for Admin broadcast notifications
    socketInstance.on('notification:broadcast', (notification) => {
      setBroadcastAlert(notification)
      // Auto-clear toast after 8 seconds
      setTimeout(() => {
        setBroadcastAlert((current) => (current?.id === notification.id ? null : current))
      }, 8000)
    })

    // Listen for Maintenance mode changes
    socketInstance.on('system:maintenance', (data) => {
      setMaintenance({
        active: Boolean(data.maintenanceMode),
        message: data.message || 'FinTrack is currently undergoing scheduled maintenance.'
      })
    })

    // Listen for account deactivation
    socketInstance.on('user:deactivated', (data) => {
      alert(data.message || 'Your account has been deactivated by an administrator.')
      localStorage.removeItem('fintrack_token')
      window.location.reload()
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [user])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineCount,
        activeSockets,
        maintenance,
        broadcastAlert,
        clearBroadcastAlert: () => setBroadcastAlert(null)
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  return useContext(SocketContext)
}
