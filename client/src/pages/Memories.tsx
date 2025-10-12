import React, { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { MemoryService } from '../services/memoryService'
import { MemorySearch } from '../components/MemorySearch'
import { MemoryMesh } from '../components/MemoryMesh'
import { LoadingCard, ErrorMessage, EmptyState } from '../components/ui/loading-spinner'
import type { Memory, MemoryInsights, SearchFilters, MemorySearchResponse } from '../types/memory'

const MemoryCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No date'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getEtherscanUrl = (txHash?: string) => {
    if (!txHash) return null
    return `https://sepolia.etherscan.io/tx/${txHash}`
  }

  return (
    <div className="bg-white border border-gray-200 p-4 hover:border-black transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-light mb-1">
            {memory.title || 'Untitled Memory'}
          </h3>
          <div className="text-sm font-mono text-gray-600 mb-2">
            {formatDate(memory.created_at)}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {memory.tx_status && (
            <span className={`px-2 py-1 text-xs font-mono uppercase tracking-wide border rounded ${getStatusColor(memory.tx_status)}`}>
              {memory.tx_status}
            </span>
          )}
          {memory.importance_score && (
            <span className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 border border-blue-200 rounded">
              {Math.round(memory.importance_score * 100)}%
            </span>
          )}
        </div>
      </div>

      {memory.summary && (
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
          {memory.summary}
        </p>
      )}

      <div className="flex items-center justify-between text-xs font-mono text-gray-500">
        <div className="flex items-center space-x-4">
          {memory.url && (
            <a
              href={memory.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              [SOURCE]
            </a>
          )}
          {memory.source && (
            <span>[{memory.source.toUpperCase()}]</span>
          )}
          {memory.access_count > 0 && (
            <span>[ACCESSED {memory.access_count}]</span>
          )}
        </div>
        
        {memory.tx_hash && (
          <a
            href={getEtherscanUrl(memory.tx_hash) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors"
          >
            [VIEW TX]
          </a>
        )}
      </div>
    </div>
  )
}

const StatsCard: React.FC<{ insights: MemoryInsights }> = ({ insights }) => {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="text-sm font-mono text-gray-600 mb-4 uppercase tracking-wide">
        [MEMORY STATS]
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-light font-mono text-gray-800">
            {insights.total_memories}
          </div>
          <div className="text-xs font-mono text-gray-600 mt-1">TOTAL MEMORIES</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono text-gray-800">
            {insights.confirmed_transactions}
          </div>
          <div className="text-xs font-mono text-gray-600 mt-1">CONFIRMED</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono text-gray-800">
            {insights.pending_transactions}
          </div>
          <div className="text-xs font-mono text-gray-600 mt-1">PENDING</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-light font-mono text-gray-800">
            {insights.topology.total_nodes}
          </div>
          <div className="text-xs font-mono text-gray-600 mt-1">MESH NODES</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-mono text-gray-600 mb-2 uppercase tracking-wide">
            SENTIMENT DISTRIBUTION
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Positive</span>
              <span>{insights.sentiment_distribution.positive}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Neutral</span>
              <span>{insights.sentiment_distribution.neutral}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Negative</span>
              <span>{insights.sentiment_distribution.negative}%</span>
            </div>
          </div>
        </div>
        
        <div>
          <div className="text-xs font-mono text-gray-600 mb-2 uppercase tracking-wide">
            RECENT ACTIVITY
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Last 7 days</span>
              <span>{insights.recent_activity.last_7_days}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Last 30 days</span>
              <span>{insights.recent_activity.last_30_days}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Memories: React.FC = () => {
  const { isConnected, address } = useWallet()
  const [memories, setMemories] = useState<Memory[]>([])
  const [insights, setInsights] = useState<MemoryInsights | null>(null)
  const [searchResults, setSearchResults] = useState<MemorySearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'mesh'>('list')

  const fetchMemories = useCallback(async () => {
    if (!address) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const [memoriesData, insightsData] = await Promise.all([
        MemoryService.getMemoriesWithTransactionDetails(address),
        MemoryService.getMemoryInsights(address)
      ])
      
      setMemories(memoriesData)
      setInsights(insightsData)
    } catch (err) {
      setError('Failed to fetch memories')
      console.error('Error fetching memories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  const handleSearch = async (query: string, filters: SearchFilters, useSemantic: boolean) => {
    if (!address) return
    
    setIsSearching(true)
    setError(null)
    
    try {
      const results = useSemantic
        ? await MemoryService.searchMemoriesWithEmbeddings(address, query)
        : await MemoryService.searchMemories(address, query, filters)
      
      setSearchResults(results)
    } catch (err) {
      setError('Search failed')
      console.error('Error searching memories:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearFilters = () => {
    setSearchResults(null)
  }

  useEffect(() => {
    if (isConnected && address) {
      fetchMemories()
    }
  }, [isConnected, address, fetchMemories])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          title="WALLET NOT CONNECTED"
          description="Connect your wallet to view your memories"
          action={{
            label: "CONNECT WALLET",
            onClick: () => window.location.href = '/'
          }}
        />
      </div>
    )
  }

  const displayMemories = searchResults?.results.map(r => r.memory) || memories
  const showSearchResults = searchResults !== null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => window.location.href = '/'}
                className="text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
              >
                [← BACK TO HOME]
              </button>
              <div className="text-sm font-mono text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-1 border border-blue-200">
                [MEMORIES DASHBOARD]
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs font-mono text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search Component */}
        <div className="mb-8">
          <MemorySearch
            onSearch={handleSearch}
            onClearFilters={handleClearFilters}
            isLoading={isSearching}
            resultCount={searchResults?.total}
          />
        </div>

        {/* Stats Card */}
        {insights && (
          <div className="mb-8">
            <StatsCard insights={insights} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 text-sm font-mono uppercase tracking-wide border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              [MEMORY LIST]
            </button>
            <button
              onClick={() => setActiveTab('mesh')}
              className={`px-4 py-2 text-sm font-mono uppercase tracking-wide border-b-2 transition-colors ${
                activeTab === 'mesh'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              [MEMORY MESH]
            </button>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={fetchMemories} />
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <LoadingCard key={index} />
                ))}
              </div>
            ) : displayMemories.length === 0 ? (
              <EmptyState
                title={showSearchResults ? "NO SEARCH RESULTS" : "NO MEMORIES FOUND"}
                description={showSearchResults ? "Try adjusting your search criteria" : "Your memories will appear here once you start using the extension"}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayMemories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mesh' && (
          <div className="h-96">
            <MemoryMesh userAddress={address || undefined} />
          </div>
        )}
      </div>
    </div>
  )
}
