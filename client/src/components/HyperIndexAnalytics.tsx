import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { HyperIndexService } from '../services/hyperindexService'
import { TrendingUp, TrendingDown, Activity, Users, Database, Clock, Zap, BarChart3 } from 'lucide-react'

interface HyperIndexAnalyticsProps {
  userAddress?: string | null
  className?: string
}

interface AnalyticsData {
  totalMemories: number
  totalUsers: number
  totalGasDeposited: number
  totalGasWithdrawn: number
  totalRelayers: number
  recentActivity: any[]
  userActivity: any[]
  gasTrends: {
    deposits: number[]
    withdrawals: number[]
    timestamps: string[]
  }
  memoryTrends: {
    daily: number[]
    timestamps: string[]
  }
}

export const HyperIndexAnalytics: React.FC<HyperIndexAnalyticsProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')

  useEffect(() => {
    fetchAnalyticsData()
  }, [userAddress, timeRange])

  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [systemStats, recentMemories, , userMemories, userGasDeposits, userGasWithdrawals] = await Promise.all([
        HyperIndexService.getSystemStats(),
        HyperIndexService.getRecentMemoryStoredEvents(50),
        userAddress ? HyperIndexService.getUserStats(userAddress) : null,
        userAddress ? HyperIndexService.getUserMemoryEvents(userAddress, 50) : [],
        userAddress ? HyperIndexService.getUserGasDeposits(userAddress, 50) : [],
        userAddress ? HyperIndexService.getUserGasWithdrawals(userAddress, 50) : []
      ])

      // Process data for analytics
      const processedData: AnalyticsData = {
        totalMemories: systemStats ? parseInt(systemStats.totalMemories) : 0,
        totalUsers: systemStats ? parseInt(systemStats.totalUsers) : 0,
        totalGasDeposited: systemStats ? parseInt(systemStats.totalGasDeposited) : 0,
        totalGasWithdrawn: systemStats ? parseInt(systemStats.totalGasWithdrawn) : 0,
        totalRelayers: systemStats ? parseInt(systemStats.totalRelayers) : 0,
        recentActivity: recentMemories || [],
        userActivity: userMemories || [],
        gasTrends: {
          deposits: (userGasDeposits || []).map(d => parseInt(d.amount)),
          withdrawals: (userGasWithdrawals || []).map(w => parseInt(w.amount)),
          timestamps: (userGasDeposits || []).map(d => d.blockNumber)
        },
        memoryTrends: {
          daily: (userMemories || []).map(() => 1), // Simple count for now
          timestamps: (userMemories || []).map(m => m.timestamp)
        }
      }

      setAnalyticsData(processedData)
    } catch (err) {
      setError('Failed to fetch analytics data')
      console.error('Error fetching analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatETH = (wei: number) => {
    const eth = wei / 1e18
    return `${eth.toFixed(4)} ETH`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString()
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 days'
      case '30d': return 'Last 30 days'
      case '90d': return 'Last 90 days'
      default: return 'Last 7 days'
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Unavailable</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return null
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
            <Badge variant="outline" className="text-xs">
              {getTimeRangeLabel()}
            </Badge>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wide border transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Memories</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNumber(analyticsData.totalMemories)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Active Users</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNumber(analyticsData.totalUsers)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Gas Deposited</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatETH(analyticsData.totalGasDeposited)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Relayers</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNumber(analyticsData.totalRelayers)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent System Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                Recent System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={activity.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Memory stored by {activity.user_id?.slice(0, 6)}...{activity.user_id?.slice(-4)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Block {activity.blockNumber} • {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatETH(parseInt(activity.gasUsed || '0'))}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Activity (if user is connected) */}
          {userAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                  Your Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.userActivity.slice(0, 5).map((activity, index) => (
                    <div key={activity.id || index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Memory Stored</p>
                          <p className="text-xs text-gray-500">
                            Block {activity.blockNumber} • {formatTimestamp(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatETH(parseInt(activity.gasUsed || '0'))}
                      </Badge>
                    </div>
                  ))}
                  
                  {analyticsData.gasTrends.deposits.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Gas Deposited</p>
                          <p className="text-xs text-gray-500">
                            {analyticsData.gasTrends.deposits.length} transactions
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-green-700">
                        +{formatETH(analyticsData.gasTrends.deposits.reduce((a, b) => a + b, 0))}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Gas Analytics */}
        {userAddress && (analyticsData.gasTrends.deposits.length > 0 || analyticsData.gasTrends.withdrawals.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                Gas Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Deposited</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatETH(analyticsData.gasTrends.deposits.reduce((a, b) => a + b, 0))}
                  </p>
                  <p className="text-xs text-gray-500">
                    {analyticsData.gasTrends.deposits.length} transactions
                  </p>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Withdrawn</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatETH(analyticsData.gasTrends.withdrawals.reduce((a, b) => a + b, 0))}
                  </p>
                  <p className="text-xs text-gray-500">
                    {analyticsData.gasTrends.withdrawals.length} transactions
                  </p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Net Balance</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatETH(
                      analyticsData.gasTrends.deposits.reduce((a, b) => a + b, 0) - 
                      analyticsData.gasTrends.withdrawals.reduce((a, b) => a + b, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Current balance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Memory Trends */}
        {userAddress && analyticsData.memoryTrends.daily.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                Memory Creation Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Clock className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Memories Created</p>
                <p className="text-lg font-semibold text-gray-900">
                  {analyticsData.memoryTrends.daily.length} memories
                </p>
                <p className="text-xs text-gray-500">
                  in {getTimeRangeLabel().toLowerCase()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
