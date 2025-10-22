import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { HyperIndexService } from '../services/hyperindexService'
import { useHyperIndex, useUserHyperIndex } from '../hooks/useHyperIndex'
import { ExternalLink, RefreshCw, Activity, Users, Database, TrendingUp, Clock, Zap } from 'lucide-react'

interface HyperIndexDashboardProps {
  userAddress: string | null
  className?: string
}

export const HyperIndexDashboard: React.FC<HyperIndexDashboardProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // System-wide data
  const { 
    systemStats, 
    recentMemories, 
    authorizedRelayers, 
    isLoading: isLoadingSystem,
    error: systemError,
    refetch: refetchSystem
  } = useHyperIndex()
  
  // User-specific data
  const { 
    userStats, 
    userMemories, 
    userGasDeposits, 
    userGasWithdrawals,
    isLoading: isLoadingUser,
    error: userError,
    refetch: refetchUser
  } = useUserHyperIndex(userAddress)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refetchSystem(),
        userAddress ? refetchUser() : Promise.resolve()
      ])
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

  if (systemError && userError) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">HyperIndex Unavailable</h3>
          <p className="text-sm text-gray-600 mb-4">
            The HyperIndex service is not running or accessible.
          </p>
          <button
            onClick={handleRefresh}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">HyperIndex Analytics</h2>
            <Badge variant="outline" className="text-xs">
              Live Data
            </Badge>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="user">User Stats</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="p-4 space-y-4">
          {isLoadingSystem ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* System Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Memories</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {systemStats ? formatNumber(systemStats.totalMemories) : '0'}
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
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {systemStats ? formatNumber(systemStats.totalUsers) : '0'}
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
                          {systemStats ? formatETH(systemStats.totalGasDeposited) : '0 ETH'}
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
                          {systemStats ? formatNumber(systemStats.totalRelayers) : '0'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                    Recent Memory Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentMemories && recentMemories.length > 0 ? (
                    <div className="space-y-3">
                      {recentMemories.slice(0, 5).map((memory, index) => (
                        <div key={memory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Memory stored by {memory.user_id.slice(0, 6)}...{memory.user_id.slice(-4)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Block {memory.blockNumber} • {formatTimestamp(memory.timestamp)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {formatETH(memory.gasUsed || '0')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* User Stats Tab */}
        <TabsContent value="user" className="p-4 space-y-4">
          {!userAddress ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">Connect wallet to view user statistics</p>
            </div>
          ) : isLoadingUser ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : userStats ? (
            <>
              {/* User Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Your Memories</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(userStats.totalMemories)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Gas Deposited</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatETH(userStats.totalGasDeposited)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Current Balance</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatETH(userStats.currentGasBalance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Activity Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                    Your Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userMemories.slice(0, 3).map((memory) => (
                      <div key={memory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Memory Stored</p>
                            <p className="text-xs text-gray-500">
                              Block {memory.blockNumber} • {formatTimestamp(memory.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatETH(memory.gasUsed || '0')}
                        </Badge>
                      </div>
                    ))}
                    
                    {userGasDeposits.slice(0, 2).map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Gas Deposited</p>
                            <p className="text-xs text-gray-500">
                              Block {deposit.blockNumber} • {formatTimestamp(deposit.blockNumber)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs text-green-700">
                          +{formatETH(deposit.amount)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">No user data found</p>
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                System Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentMemories && recentMemories.length > 0 ? (
                <div className="space-y-3">
                  {recentMemories.slice(0, 10).map((memory) => (
                    <div key={memory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Memory stored by {memory.user_id.slice(0, 6)}...{memory.user_id.slice(-4)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Hash: {memory.hash.slice(0, 10)}...{memory.hash.slice(-6)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Block {memory.blockNumber} • {formatTimestamp(memory.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs mb-1">
                          {formatETH(memory.gasUsed || '0')}
                        </Badge>
                        <p className="text-xs text-gray-500">
                          Gas Price: {formatETH(memory.gasPrice || '0')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                Authorized Relayers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {authorizedRelayers && authorizedRelayers.length > 0 ? (
                <div className="space-y-3">
                  {authorizedRelayers.map((relayer) => (
                    <div key={relayer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${relayer.authorized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {relayer.relayer_id.slice(0, 6)}...{relayer.relayer_id.slice(-4)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Block {relayer.blockNumber} • {formatTimestamp(relayer.blockNumber)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={relayer.authorized ? "default" : "destructive"} className="text-xs">
                        {relayer.authorized ? 'Authorized' : 'Revoked'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No relayers found</p>
              )}
            </CardContent>
          </Card>

          {/* Network Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600">
                Network Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Gas Deposited</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {systemStats ? formatETH(systemStats.totalGasDeposited) : '0 ETH'}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Gas Withdrawn</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {systemStats ? formatETH(systemStats.totalGasWithdrawn) : '0 ETH'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
