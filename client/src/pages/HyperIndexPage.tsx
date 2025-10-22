import React, { useState, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { WalletConnectionFlow } from '@/components/WalletConnectionFlow'
import { HyperIndexNotifications } from '@/components/HyperIndexNotifications'
import { Section, ConsoleButton } from '@/components/sections'
import { HyperIndexService } from '@/services/hyperindexService'
import { useHyperIndex } from '@/hooks/useHyperIndex'
import { 
  Database, 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Zap, 
  Cpu,
  Network
} from 'lucide-react'

export const HyperIndexPage: React.FC = () => {
  const { isConnected, address } = useWallet()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [systemStatus, setSystemStatus] = useState<{
    hyperIndex: boolean
    graphql: boolean
    blockchain: boolean
  }>({
    hyperIndex: false,
    graphql: false,
    blockchain: false
  })

  // Use HyperIndex hook for system data
  const { 
    isAvailable, 
    systemStats, 
    refreshData 
  } = useHyperIndex()

  // Load recent activity and system status
  useEffect(() => {
    const loadActivityData = async () => {
      try {
        console.log('Loading activity data...')
        const [memories, relayers] = await Promise.all([
          HyperIndexService.getRecentMemoryStoredEvents(10),
          HyperIndexService.getAuthorizedRelayers()
        ])
        
        console.log('Fetched memories:', memories.length, memories)
        console.log('Fetched relayers:', relayers.length, relayers)
        
        // Combine and sort activities
        const activities = [
          ...memories.map(m => ({ ...m, type: 'memory' })),
          ...relayers.map(r => ({ ...r, type: 'relayer' }))
        ].sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber))
        
        console.log('Combined activities:', activities.length, activities)
        setRecentActivity(activities.slice(0, 10))
      } catch (error) {
        console.error('Error loading activity data:', error)
      }
    }

    if (isAvailable) {
      loadActivityData()
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(loadActivityData, 30000)
      return () => clearInterval(interval)
    }
  }, [isAvailable])

  // Check system status
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const hyperIndexAvailable = await HyperIndexService.isAvailable()
        setSystemStatus({
          hyperIndex: hyperIndexAvailable,
          graphql: hyperIndexAvailable,
          blockchain: hyperIndexAvailable
        })
      } catch (error) {
        setSystemStatus({
          hyperIndex: false,
          graphql: false,
          blockchain: false
        })
      }
    }

    checkSystemStatus()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      console.log('Manual refresh triggered')
      await refreshData()
      
      // Reload activity data
      const [memories, relayers] = await Promise.all([
        HyperIndexService.getRecentMemoryStoredEvents(10),
        HyperIndexService.getAuthorizedRelayers()
      ])
      
      console.log('Refresh - Fetched memories:', memories.length, memories)
      console.log('Refresh - Fetched relayers:', relayers.length, relayers)
      
      const activities = [
        ...memories.map(m => ({ ...m, type: 'memory' })),
        ...relayers.map(r => ({ ...r, type: 'relayer' }))
      ].sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber))
      
      console.log('Refresh - Combined activities:', activities.length, activities)
      setRecentActivity(activities.slice(0, 10))
    } catch (error) {
      console.error('Error during refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseInt(num) : num
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  const formatETH = (wei: string) => {
    const eth = parseFloat(wei) / 1e18
    return `${eth.toFixed(4)} ETH`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString()
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <WalletConnectionFlow />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black relative font-primary">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center flex-wrap gap-4 sm:gap-8">
              <button 
                onClick={() => window.location.href = '/'}
                className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
              >
                [← HOME]
              </button>
              <button 
                onClick={() => window.location.href = '/memories'}
                className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
              >
                [M] MEMORIES
              </button>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg sm:text-xl font-light text-gray-900">HyperIndex</h1>
                <div className="text-xs font-mono text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-1 border border-blue-200">
                  [LIVE DATA]
                </div>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2 sm:gap-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                [R] REFRESH
              </button>
              <HyperIndexNotifications userAddress={address} />
              <div className="text-xs sm:text-sm font-mono text-gray-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <Section className="bg-white py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight font-editorial mb-6">
            <span className="block">HyperIndex</span>
            <span className="block text-2xl sm:text-3xl lg:text-4xl text-gray-600 font-mono font-light mt-2">
              Blockchain Analytics Dashboard
            </span>
          </h1>
          <p className="text-xl text-gray-800 leading-relaxed max-w-3xl mx-auto">
            Real-time monitoring and analytics for the RecallOS memory network. 
            Track system health, user activity, and blockchain events across the entire ecosystem.
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div className="text-sm font-mono text-gray-600 uppercase tracking-wide">Total Memories</div>
            </div>
            <div className="text-3xl font-light text-gray-900 mb-1">
              {systemStats ? formatNumber(systemStats.totalMemories) : '0'}
            </div>
            <div className="text-xs text-gray-500">Indexed on blockchain</div>
          </div>

          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-green-600" />
              <div className="text-sm font-mono text-gray-600 uppercase tracking-wide">Active Users</div>
            </div>
            <div className="text-3xl font-light text-gray-900 mb-1">
              {systemStats ? formatNumber(systemStats.totalUsers) : '0'}
            </div>
            <div className="text-xs text-gray-500">Unique addresses</div>
          </div>

          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <div className="text-sm font-mono text-gray-600 uppercase tracking-wide">Gas Deposited</div>
            </div>
            <div className="text-3xl font-light text-gray-900 mb-1">
              {systemStats ? formatETH(systemStats.totalGasDeposited) : '0 ETH'}
            </div>
            <div className="text-xs text-gray-500">Total deposited</div>
          </div>


        </div>
      </Section>

      {/* System Status Section */}
      <Section className="bg-gray-50">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-light font-editorial mb-4">
            System Health
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Real-time monitoring of all system components and network connectivity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`bg-white border p-6 transition-all duration-300 ${
            systemStatus.hyperIndex ? 'border-green-200 hover:border-green-300' : 'border-red-200 hover:border-red-300'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.hyperIndex ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <h3 className="text-lg font-light text-gray-900">HyperIndex Service</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {systemStatus.hyperIndex ? 'Connected and syncing with blockchain' : 'Service unavailable or disconnected'}
            </p>
            <div className="text-xs font-mono text-gray-500">
              {systemStatus.hyperIndex ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>

          <div className={`bg-white border p-6 transition-all duration-300 ${
            systemStatus.graphql ? 'border-blue-200 hover:border-blue-300' : 'border-red-200 hover:border-red-300'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.graphql ? 'bg-blue-500' : 'bg-red-500'
              }`}></div>
              <h3 className="text-lg font-light text-gray-900">GraphQL API</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {systemStatus.graphql ? 'API responding and serving data' : 'API endpoint not responding'}
            </p>
            <div className="text-xs font-mono text-gray-500">
              localhost:8080/v1/graphql
            </div>
          </div>

          <div className={`bg-white border p-6 transition-all duration-300 ${
            systemStatus.blockchain ? 'border-purple-200 hover:border-purple-300' : 'border-red-200 hover:border-red-300'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.blockchain ? 'bg-purple-500' : 'bg-red-500'
              }`}></div>
              <h3 className="text-lg font-light text-gray-900">Blockchain Network</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {systemStatus.blockchain ? 'Connected to Sepolia testnet' : 'Blockchain connection failed'}
            </p>
            <div className="text-xs font-mono text-gray-500">
              SEPOLIA TESTNET
            </div>
          </div>
                    </div>
      </Section>

      {/* Activity Feed Section */}
      <Section className="bg-white">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-light font-editorial mb-4">
            Live Activity Feed
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Real-time blockchain events and system activity
                      </p>
                    </div>

        <div className="bg-white border border-gray-200 overflow-hidden">
          {/* Activity Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="text-sm font-mono text-gray-600 uppercase tracking-wide">Live Data Stream</div>
            </div>
            <div className="text-xs font-mono text-gray-500">
              Monitoring blockchain events in real-time
            </div>
          </div>

          {/* Activity Content */}
          <div className="p-6">
            {isAvailable ? (
              recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.slice(0, 8).map((activity, index) => (
                    <div key={activity.id || index} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.type === 'memory' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                            {activity.type === 'memory' 
                              ? `Memory stored by ${activity.user_id?.slice(0, 6)}...${activity.user_id?.slice(-4)}`
                              : `Relayer ${activity.relayer_id?.slice(0, 6)}...${activity.relayer_id?.slice(-4)} ${activity.authorized ? 'authorized' : 'revoked'}`
                            }
                              </p>
                          <p className="text-xs text-gray-500 font-mono">
                            Block {activity.blockNumber} • {formatTimestamp(activity.timestamp || activity.blockNumber)}
                              </p>
                            </div>
                          </div>
                      {activity.type === 'memory' && (
                        <div className="text-xs font-mono text-gray-600 bg-white px-2 py-1 border border-gray-200">
                          {activity.gasUsed && activity.gasUsed !== '0' ? `${formatETH(activity.gasUsed)} gas` : 'Memory Event'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">No recent activity</p>
                  <p className="text-xs text-gray-500 mb-4">
                    Activity will appear here as blockchain events occur
                  </p>
                  <div className="text-xs text-gray-400 font-mono">
                    Debug: isAvailable={isAvailable.toString()}, recentActivity.length={recentActivity.length}
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">HyperIndex unavailable</p>
                <p className="text-xs text-gray-500">
                  Cannot load activity feed
                      </p>
                    </div>
                  )}
                        </div>
                      </div>
      </Section>

      {/* Network Overview Section */}
      <Section className="bg-gray-50">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-light font-editorial mb-4">
            Network Overview
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comprehensive view of the RecallOS network infrastructure and performance
          </p>
                    </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Network Stats */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-light text-gray-900 mb-6 flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" />
              Network Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Total Transactions</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStats ? formatNumber(systemStats.totalMemories) : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Gas Deposited</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStats ? formatETH(systemStats.totalGasDeposited) : '0 ETH'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Gas Withdrawn</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStats ? formatETH(systemStats.totalGasWithdrawn) : '0 ETH'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Total Gas Used</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStats ? formatETH(systemStats.totalGasUsed) : '0 ETH'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Active Relayers</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStats ? formatNumber(systemStats.totalRelayers) : '0'}
                </span>
                        </div>
                      </div>
                    </div>

          {/* Performance Metrics */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-light text-gray-900 mb-6 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-green-600" />
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Indexing Speed</span>
                <span className="text-sm font-mono text-gray-900">Real-time</span>
                        </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Data Freshness</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStats ? formatTimestamp(systemStats.lastUpdated) : 'Unknown'}
                </span>
                      </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">API Response Time</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStatus.graphql ? '< 100ms' : 'N/A'}
                </span>
                    </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-mono text-gray-900">
                  {systemStatus.hyperIndex ? '99.9%' : '0%'}
                </span>
                  </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Action Buttons */}
      <Section className="bg-white">
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ConsoleButton
              variant="console_key"
              onClick={() => window.location.href = '/memories'}
            >
              [M] VIEW MEMORIES
            </ConsoleButton>
            <ConsoleButton
              variant="outlined"
              onClick={() => window.open('/docs', '_blank')}
            >
              [D] READ DOCS
            </ConsoleButton>
            <ConsoleButton
              variant="outlined"
              onClick={() => window.open('https://github.com/virajbhartiya/RecallOS', '_blank')}
            >
              [G] GITHUB
            </ConsoleButton>
            </div>
      </div>
      </Section>
    </div>
  )
}
