import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { HyperIndexService } from '../services/hyperindexService'
import { Bell, X, Activity, Database, TrendingUp, Zap, Clock } from 'lucide-react'

interface Notification {
  id: string
  type: 'memory_stored' | 'gas_deposited' | 'gas_withdrawn' | 'relayer_authorized' | 'system_update'
  title: string
  message: string
  timestamp: string
  data?: any
  read: boolean
}

interface HyperIndexNotificationsProps {
  userAddress?: string | null
  className?: string
}

export const HyperIndexNotifications: React.FC<HyperIndexNotificationsProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())
  const [isPolling, setIsPolling] = useState(false)

  // Poll for new events every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      checkForNewEvents()
    }, 30000) // 30 seconds

    // Initial check
    checkForNewEvents()

    return () => clearInterval(pollInterval)
  }, [userAddress])

  const checkForNewEvents = useCallback(async () => {
    if (isPolling) return
    
    setIsPolling(true)
    try {
      const [recentMemories, recentGasDeposits, recentGasWithdrawals, recentRelayers] = await Promise.all([
        HyperIndexService.getRecentMemoryStoredEvents(10),
        userAddress ? HyperIndexService.getUserGasDeposits(userAddress, 5) : [],
        userAddress ? HyperIndexService.getUserGasWithdrawals(userAddress, 5) : [],
        HyperIndexService.getAuthorizedRelayers()
      ])

      const newNotifications: Notification[] = []

      // Check for new memory events
      recentMemories.forEach((memory) => {
        const memoryTime = new Date(parseInt(memory.timestamp) * 1000)
        if (memoryTime > lastChecked) {
          newNotifications.push({
            id: `memory-${memory.id}`,
            type: 'memory_stored',
            title: 'New Memory Stored',
            message: `Memory stored by ${memory.user_id.slice(0, 6)}...${memory.user_id.slice(-4)}`,
            timestamp: memory.timestamp,
            data: memory,
            read: false
          })
        }
      })

      // Check for new gas deposits (user-specific)
      if (userAddress) {
        recentGasDeposits.forEach((deposit) => {
          const depositTime = new Date(parseInt(deposit.blockNumber) * 1000) // Using blockNumber as timestamp approximation
          if (depositTime > lastChecked) {
            newNotifications.push({
              id: `deposit-${deposit.id}`,
              type: 'gas_deposited',
              title: 'Gas Deposited',
              message: `You deposited ${(parseInt(deposit.amount) / 1e18).toFixed(4)} ETH`,
              timestamp: deposit.blockNumber,
              data: deposit,
              read: false
            })
          }
        })

        // Check for new gas withdrawals
        recentGasWithdrawals.forEach((withdrawal) => {
          const withdrawalTime = new Date(parseInt(withdrawal.blockNumber) * 1000)
          if (withdrawalTime > lastChecked) {
            newNotifications.push({
              id: `withdrawal-${withdrawal.id}`,
              type: 'gas_withdrawn',
              title: 'Gas Withdrawn',
              message: `You withdrew ${(parseInt(withdrawal.amount) / 1e18).toFixed(4)} ETH`,
              timestamp: withdrawal.blockNumber,
              data: withdrawal,
              read: false
            })
          }
        })
      }

      // Check for new relayer authorizations
      recentRelayers.forEach((relayer) => {
        const relayerTime = new Date(parseInt(relayer.blockNumber) * 1000)
        if (relayerTime > lastChecked) {
          newNotifications.push({
            id: `relayer-${relayer.id}`,
            type: 'relayer_authorized',
            title: relayer.authorized ? 'Relayer Authorized' : 'Relayer Revoked',
            message: `Relayer ${relayer.relayer_id.slice(0, 6)}...${relayer.relayer_id.slice(-4)} ${relayer.authorized ? 'authorized' : 'revoked'}`,
            timestamp: relayer.blockNumber,
            data: relayer,
            read: false
          })
        }
      })

      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev].slice(0, 50)) // Keep last 50 notifications
      }

      setLastChecked(new Date())
    } catch (error) {
      console.error('Error checking for new events:', error)
    } finally {
      setIsPolling(false)
    }
  }, [userAddress, lastChecked, isPolling])


  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
  }

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'memory_stored':
        return <Database className="w-4 h-4 text-blue-600" />
      case 'gas_deposited':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'gas_withdrawn':
        return <TrendingUp className="w-4 h-4 text-red-600" />
      case 'relayer_authorized':
        return <Zap className="w-4 h-4 text-yellow-600" />
      case 'system_update':
        return <Activity className="w-4 h-4 text-purple-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }


  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                  Notifications
                </CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No notifications yet
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(parseInt(notification.timestamp) * 1000).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              <button
                                onClick={() => removeNotification(notification.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
