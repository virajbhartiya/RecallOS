import React, { useEffect, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'

interface ToastProps {
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${getToastStyles()}`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-sm font-mono">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="ml-2 text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export const WalletConnectionToast: React.FC = () => {
  const { isConnecting } = useWallet()
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>>([])

  useEffect(() => {
    if (isConnecting) {
      const toastId = Date.now().toString()
      setToasts(prev => [...prev, { id: toastId, message: 'Connecting to wallet...', type: 'info' }])
    }
  }, [isConnecting])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  )
}
