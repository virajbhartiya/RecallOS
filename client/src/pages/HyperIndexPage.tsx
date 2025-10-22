import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { WalletConnectionFlow } from '@/components/WalletConnectionFlow'
import { HyperIndexDashboard } from '@/components/HyperIndexDashboard'
import { HyperIndexAnalytics } from '@/components/HyperIndexAnalytics'
import { HyperIndexNotifications } from '@/components/HyperIndexNotifications'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, BarChart3, Bell, Activity } from 'lucide-react'

export const HyperIndexPage: React.FC = () => {
  const { isConnected, address } = useWallet()
  const [activeTab, setActiveTab] = useState('dashboard')

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
              >
                [← HOME]
              </button>
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">HyperIndex</h1>
                <Badge variant="outline" className="text-xs">
                  Live Data
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <HyperIndexNotifications userAddress={address} />
              <div className="text-sm font-mono text-gray-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <HyperIndexDashboard userAddress={address} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <HyperIndexAnalytics userAddress={address} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real-time Activity Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Real-time Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Live Data Stream</p>
                          <p className="text-xs text-gray-600">
                            Monitoring blockchain events in real-time
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600">
                        Activity feed will show live blockchain events
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Events are polled every 30 seconds
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono uppercase tracking-wide text-gray-600 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">HyperIndex Service</p>
                          <p className="text-xs text-gray-600">Connected and syncing</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-green-700">
                        Online
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">GraphQL API</p>
                          <p className="text-xs text-gray-600">localhost:8080/v1/graphql</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-blue-700">
                        Active
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Blockchain Network</p>
                          <p className="text-xs text-gray-600">Sepolia Testnet</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-purple-700">
                        Synced
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Database className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Indexed Events</p>
                  <p className="text-lg font-semibold text-gray-900">Live</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Update Frequency</p>
                  <p className="text-lg font-semibold text-gray-900">30s</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Bell className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Notifications</p>
                  <p className="text-lg font-semibold text-gray-900">Active</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Analytics</p>
                  <p className="text-lg font-semibold text-gray-900">Real-time</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
