import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useHyperIndex, useUserHyperIndex } from '../hooks/useHyperIndex'
import { HyperIndexMemoryStored, HyperIndexUser } from '../services/hyperindexService'
import { ExternalLink, RefreshCw, Activity, Users, Database } from 'lucide-react'

interface HyperIndexPanelProps {
  userAddress?: string | null
}

export function HyperIndexPanel({ userAddress }: HyperIndexPanelProps) {
  const { isAvailable, isLoading, systemStats, recentMemories, refreshData } = useHyperIndex()
  const { userStats, userMemories, isLoading: userLoading, refresh: refreshUser } = useUserHyperIndex(userAddress || null)
  const [activeTab, setActiveTab] = useState('system')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            HyperIndex Status
            <span className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-1 border border-purple-200 rounded">
              ENVIO
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking HyperIndex availability...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            HyperIndex Status
            <span className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-1 border border-purple-200 rounded">
              ENVIO
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">HyperIndex Not Available</h3>
            <p className="text-muted-foreground mb-4">
              The HyperIndex service is not running. Start it with:
            </p>
            <code className="block bg-muted p-2 rounded text-sm mb-4">
              cd hyperindex && pnpm dev
            </code>
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            HyperIndex Data
            <span className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-1 border border-purple-200 rounded">
              ENVIO
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Activity className="h-3 w-3 mr-1" />
              Connected
            </Badge>
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            {userAddress && <TabsTrigger value="user">User</TabsTrigger>}
          </TabsList>

          <TabsContent value="system" className="space-y-4">
            <SystemStatsPanel stats={systemStats} />
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <RecentMemoriesPanel memories={recentMemories} />
          </TabsContent>

          {userAddress && (
            <TabsContent value="user" className="space-y-4">
              <UserStatsPanel 
                userStats={userStats} 
                userMemories={userMemories}
                isLoading={userLoading}
                onRefresh={refreshUser}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function SystemStatsPanel({ stats }: { stats: any }) {
  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No system statistics available
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.totalMemories}</div>
        <div className="text-sm text-muted-foreground">Total Memories</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
        <div className="text-sm text-muted-foreground">Total Users</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">
          {parseFloat(stats.totalGasDeposited) / 1e18} ETH
        </div>
        <div className="text-sm text-muted-foreground">Gas Deposited</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">{stats.totalRelayers}</div>
        <div className="text-sm text-muted-foreground">Relayers</div>
      </div>
    </div>
  )
}

function RecentMemoriesPanel({ memories }: { memories: HyperIndexMemoryStored[] }) {
  if (!memories.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recent memory events found
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {memories.map((memory) => (
        <div key={memory.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  Block #{memory.blockNumber}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {new Date(parseInt(memory.timestamp) * 1000).toLocaleDateString()}
                </Badge>
              </div>
              <div className="text-sm font-mono text-muted-foreground mb-1">
                User: {memory.user_id.slice(0, 6)}...{memory.user_id.slice(-4)}
              </div>
              <div className="text-sm font-mono text-muted-foreground mb-1">
                Hash: {memory.hash.slice(0, 10)}...{memory.hash.slice(-6)}
              </div>
              <div className="text-sm font-mono text-muted-foreground">
                TX: {memory.transactionHash.slice(0, 10)}...{memory.transactionHash.slice(-6)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${memory.transactionHash}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function UserStatsPanel({ 
  userStats, 
  userMemories, 
  isLoading, 
  onRefresh 
}: { 
  userStats: HyperIndexUser | null
  userMemories: HyperIndexMemoryStored[]
  isLoading: boolean
  onRefresh: () => void
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading user data...</span>
      </div>
    )
  }

  if (!userStats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4" />
        <p>No user statistics found</p>
        <Button onClick={onRefresh} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{userStats.totalMemories}</div>
          <div className="text-sm text-muted-foreground">Memories</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {parseFloat(userStats.totalGasDeposited) / 1e18} ETH
          </div>
          <div className="text-sm text-muted-foreground">Deposited</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {parseFloat(userStats.totalGasWithdrawn) / 1e18} ETH
          </div>
          <div className="text-sm text-muted-foreground">Withdrawn</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {parseFloat(userStats.currentGasBalance) / 1e18} ETH
          </div>
          <div className="text-sm text-muted-foreground">Balance</div>
        </div>
      </div>

      {userMemories.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">Recent User Memories</h4>
          <div className="space-y-2">
            {userMemories.slice(0, 5).map((memory) => (
              <div key={memory.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-mono">
                    {memory.hash.slice(0, 10)}...{memory.hash.slice(-6)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Block #{memory.blockNumber}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={onRefresh} variant="outline" size="sm" className="w-full">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh User Data
      </Button>
    </div>
  )
}
