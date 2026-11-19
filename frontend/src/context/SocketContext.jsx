import { createContext, useContext, useEffect, useRef, useState } from 'react'
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
  const socketRef = useRef(null)

  useEffect(() => {
    // If user logged out, cleanly disconnect the previous socket
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
        setOnlineCount(0)
        setActiveSockets(0)
      }
      return
    }

    // Disconnect any previous socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect()
    }

    const token = getAuthToken()
    const socketInstance = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    socketRef.current = socketInstance

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

    // Real-time presence counts
    socketInstance.on('presence:count', (data) => {
      if (data.onlineUsers !== undefined) setOnlineCount(data.onlineUsers)
      if (data.activeSockets !== undefined) setActiveSockets(data.activeSockets)
    })

    // Admin broadcast notifications
    socketInstance.on('notification:broadcast', (notification) => {
      setBroadcastAlert(notification)
      setTimeout(() => {
        setBroadcastAlert((current) => (current?.id === notification.id ? null : current))
      }, 8000)
    })

    // Maintenance mode changes
    socketInstance.on('system:maintenance', (data) => {
      setMaintenance({
        active: Boolean(data.maintenanceMode),
        message: data.message || 'FinTrack is currently undergoing scheduled maintenance.'
      })
    })

    // Account deactivation
    socketInstance.on('user:deactivated', (data) => {
      alert(data.message || 'Your account has been deactivated by an administrator.')
      localStorage.removeItem('fintrack_token')
      window.location.reload()
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
      socketRef.current = null
    }
  }, [user])

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineCount,
        activeSockets,
        maintenance,
        broadcastAlert,
        clearBroadcastAlert: () => setBroadcastAlert(null),
        disconnectSocket
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  return useContext(SocketContext)
}
