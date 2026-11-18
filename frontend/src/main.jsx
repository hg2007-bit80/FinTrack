import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { TransactionProvider } from './context/TransactionContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SocketProvider>
        <TransactionProvider>
          <App />
        </TransactionProvider>
      </SocketProvider>
    </AuthProvider>
  </StrictMode>
)
