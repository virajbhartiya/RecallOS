import React, { useEffect, useState } from 'react'
import { useBlockscout } from '@/hooks/useBlockscout'

interface NetworkHealthIndicatorProps {
  network: string
  className?: string
}

export const NetworkHealthIndicator: React.FC<NetworkHealthIndicatorProps> = ({
  network,
  className = ''
}) => {
  const { checkNetworkHealth, getNetworkName, isNetworkHealthy } = useBlockscout()
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const isHealthy = isNetworkHealthy(network)
  const networkName = getNetworkName(network)

  useEffect(() => {
    const checkHealth = async () => {
      setIsChecking(true)
      try {
        await checkNetworkHealth(network)
        setLastChecked(new Date())
      } catch (error) {
        console.error('Failed to check network health:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Check health on mount
    checkHealth()

    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [network, checkNetworkHealth])

  const getHealthColor = () => {
    if (isChecking) return 'bg-blue-500 animate-pulse'
    return isHealthy ? 'bg-green-500' : 'bg-red-500'
  }

  const getHealthText = () => {
    if (isChecking) return 'Checking...'
    return isHealthy ? 'Healthy' : 'Unhealthy'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getHealthColor()}`}></div>
      <span className="text-xs font-mono text-gray-600">
        {networkName}
      </span>
      <span className="text-xs text-gray-500 font-mono">
        {getHealthText()}
      </span>
      {lastChecked && (
        <span className="text-xs text-gray-400 font-mono">
          {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
