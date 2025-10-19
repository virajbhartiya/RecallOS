import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { WalletStatus } from '@/components/WalletStatus'
import { WalletConnectionFlow } from '@/components/WalletConnectionFlow'
import { WalletStatusBar } from '@/components/WalletStatusBar'
import { MemoryService } from '@/services/memoryService'
import { SearchService } from '@/services/search'
import { MemoryMesh } from '@/components/MemoryMesh'
import { useBlockscout } from '@/hooks/useBlockscout'
import { TransactionStatusIndicator } from '@/components/TransactionStatusIndicator'
import { NetworkHealthIndicator } from '@/components/NetworkHealthIndicator'
import { TransactionDetailsOverlay } from '@/components/TransactionDetailsOverlay'
import { TransactionHistorySidebar } from '@/components/TransactionHistorySidebar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Memory, MemoryInsights, SearchFilters, MemorySearchResponse, MemoryMesh as MemoryMeshType } from '@/types/memory'

const MemoryCard: React.FC<{
  memory: Memory
  isSelected: boolean
  onSelect: (memory: Memory) => void
  onViewTransaction?: (txHash: string, network: string) => void
  searchResult?: {
    search_type?: 'keyword' | 'semantic' | 'hybrid'
    blended_score?: number
  }
}> = ({ memory, isSelected, onSelect, onViewTransaction, searchResult }) => {
  const getSourceColorLocal = (source?: string) => {
    const s = (source || '').toLowerCase()
    if (s.includes('extension') || s.includes('browser')) return '#0ea5e9'
    if (s.includes('on_chain') || s.includes('on-chain') || s.includes('onchain')) return '#22c55e'
    if (s.includes('manual')) return '#8b5cf6'
    if (s.includes('reason') || s.includes('ai')) return '#f59e0b'
    return '#94a3b8'
  }
  return (
    <button
      onClick={() => onSelect(memory)}
      className={`w-full text-left p-2 rounded transition-all duration-200 group border ${
        isSelected
          ? 'bg-blue-50 border-blue-200'
          : 'hover:bg-gray-50 border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSourceColorLocal(memory.source) }} />
          <span className="truncate">{memory.title || 'Untitled Memory'}</span>
        </h3>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {memory.tx_status && (
            <div className={`w-1.5 h-1.5 rounded-full ${
              memory.tx_status === 'confirmed' ? 'bg-green-500' :
              memory.tx_status === 'pending' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} title={memory.tx_status}></div>
          )}
          {memory.tx_hash && memory.tx_hash.startsWith('0x') && memory.tx_hash.length === 66 && onViewTransaction && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onViewTransaction(memory.tx_hash!, memory.blockchain_network || 'sepolia')
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-mono cursor-pointer"
              title="View real transaction on Blockscout"
            >
              TX
            </span>
          )}
          {searchResult?.blended_score !== undefined && (
            <span className="text-xs text-gray-500 font-mono">
              {(searchResult.blended_score * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        <span>{memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'No date'}</span>
        <span>•</span>
        <span className="uppercase font-mono text-xs">{memory.source}</span>
      </div>
      
      {(memory.summary || memory.content) && (
        <p className="text-xs text-gray-600 line-clamp-1 leading-relaxed">
          {memory.summary || (memory.content && memory.content.slice(0, 60) + (memory.content.length > 60 ? '...' : ''))}
        </p>
      )}
    </button>
  )
}

const MemoryDetails: React.FC<{
  memory: Memory | null
  expandedContent: boolean
  setExpandedContent: (expanded: boolean) => void
  onViewTransaction?: (txHash: string, network: string) => void
}> = ({ memory, expandedContent, setExpandedContent, onViewTransaction }) => {
  if (!memory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
            </svg>
          </div>
          <h3 className="text-lg font-light text-gray-900 mb-2">[SELECT A MEMORY]</h3>
          <p className="text-sm font-mono text-gray-500">Choose a memory from the list to view its details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-light text-gray-900 mb-2 leading-tight">
            {memory.title || 'Untitled Memory'}
                  </h3>
                  <div className="flex items-center gap-3 text-sm font-mono text-gray-500">
            <span>{memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'NO DATE'}</span>
            {memory.source && (
                      <>
                        <span>•</span>
                        <span className="font-mono uppercase text-xs bg-gray-100 px-2 py-1 border border-gray-200">
                  [{memory.source}]
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
          {memory.tx_status && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-600">[STATUS]</span>
                      <span className={`px-3 py-1 text-sm font-mono uppercase tracking-wide border ${
                memory.tx_status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                memory.tx_status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                {memory.tx_status}
                      </span>
                      {memory.tx_hash && memory.tx_hash.startsWith('0x') && memory.tx_hash.length === 66 && onViewTransaction && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onViewTransaction(memory.tx_hash!, memory.blockchain_network || 'sepolia')}
                            className="text-xs font-mono text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 border border-blue-200 hover:border-blue-300 transition-all duration-200"
                          >
                            [VIEW TX]
                          </button>
                          <TransactionStatusIndicator 
                            txHash={memory.tx_hash} 
                            network={memory.blockchain_network || 'sepolia'}
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
          {memory.importance_score && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-600">[IMPORTANCE]</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 h-2 border border-gray-300">
                          <div 
                            className="bg-blue-500 h-2 transition-all duration-300" 
                    style={{ width: `${memory.importance_score * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-mono text-gray-600">
                  {Math.round(memory.importance_score * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

        {memory.summary && (
                  <div className="mb-6">
                    <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[SUMMARY]</h4>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                {memory.summary}
                      </p>
                    </div>
                  </div>
                )}

        {memory.content && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide">[CONTENT]</h4>
                      <button
                        onClick={() => setExpandedContent(!expandedContent)}
                        className="text-sm font-mono text-blue-600 hover:text-black bg-blue-50 px-3 py-1 border border-blue-200 hover:border-black transition-all duration-200"
                      >
                {expandedContent ? '[COLLAPSE]' : '[EXPAND]'}
                      </button>
                    </div>
            <div className="bg-gray-50 border border-gray-200 p-4">
              <p className={`text-sm text-gray-700 leading-relaxed ${expandedContent ? '' : 'line-clamp-6'}`}>
                {memory.content}
                      </p>
                    </div>
                  </div>
                )}

        {memory.url && memory.url !== 'unknown' && (
                  <div className="mb-6">
                    <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[SOURCE URL]</h4>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <a
                href={memory.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 break-all"
                      >
                {memory.url}
                      </a>
                    </div>
                  </div>
                )}

        {memory.page_metadata && (
          <div className="mb-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[METADATA]</h4>
            <div className="bg-gray-50 border border-gray-200 p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(memory.page_metadata, null, 2)}
              </pre>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

export const Memories: React.FC = () => {
  const { isConnected, address, gasBalance } = useWallet()
  const { showTransactionNotification, showAllTransactions, prefetchTransaction } = useBlockscout()
  const [memories, setMemories] = useState<Memory[]>([])
  const [insights, setInsights] = useState<MemoryInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [expandedContent, setExpandedContent] = useState(false)
  const similarityThreshold = 0.3
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false)
  const [meshStats, setMeshStats] = useState<{ nodes: number; edges: number }>({ nodes: 0, edges: 0 })
  
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [selectedTxHash, setSelectedTxHash] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<string>('sepolia')
  
  const [showTransactionHistorySidebar, setShowTransactionHistorySidebar] = useState(false)
  
  const [searchResults, setSearchResults] = useState<MemorySearchResponse | null>(null)
  const [searchAnswer, setSearchAnswer] = useState<string | null>(null)
  const [searchMeta, setSearchMeta] = useState<string | null>(null)
  const [searchJobId, setSearchJobId] = useState<string | null>(null)
  const [searchCitations, setSearchCitations] = useState<Array<{ label: number; memory_id: string; title: string | null; url: string | null }> | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showOnlyCited, setShowOnlyCited] = useState(true)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchMemories = useCallback(async () => {
    if (!address) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const [memoriesData, insightsData] = await Promise.all([
        MemoryService.getMemoriesWithTransactionDetails(address),
        MemoryService.getMemoryInsights(address)
      ])
      
      setMemories(memoriesData || [])
      setInsights(insightsData)
      
      const transactionsToPrefetch = (memoriesData || [])
        .filter(memory => memory.tx_hash && memory.tx_hash.startsWith('0x'))
        .map(memory => ({
          txHash: memory.tx_hash!,
          network: memory.blockchain_network || 'sepolia'
        }))
      
      if (transactionsToPrefetch.length > 0) {
        console.log(`Prefetching ${transactionsToPrefetch.length} transactions`)
        transactionsToPrefetch.forEach(({ txHash, network }) => {
          prefetchTransaction(txHash, network)
        })
      }
    } catch (err) {
      setError('Failed to fetch memories')
      console.error('Error fetching memories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [address, prefetchTransaction])

  const handleSelectMemory = (memory: Memory) => {
    const full = memories.find(m => m.id === memory.id)
    setSelectedMemory(full || memory)
    setExpandedContent(false)
  }

  const handleNodeClick = (memoryId: string) => {
    const fromMemories = memories.find(m => m.id === memoryId)
    const fromSearch = searchResults?.results.find(r => r.memory.id === memoryId)?.memory
    const preferred = fromMemories || fromSearch
    if (preferred) {
      const full = fromMemories || preferred
      setSelectedMemory(full)
      setExpandedContent(false)
      setIsNodeModalOpen(true)
    }
  }

  const handleCitationClick = (memoryId: string) => {
    const fromMemories = memories.find(m => m.id === memoryId)
    const fromSearch = searchResults?.results.find(r => r.memory.id === memoryId)?.memory
    const chosen = fromMemories || fromSearch
    if (chosen) {
      setSelectedMemory(chosen)
      setExpandedContent(false)
      if (isSidebarCollapsed) {
        setIsNodeModalOpen(true)
      }
    }
  }

  const handleMeshLoad = useCallback((mesh: MemoryMeshType) => {
    const nodeCount = Array.isArray(mesh.nodes) ? mesh.nodes.length : 0
    const edgeCount = Array.isArray(mesh.edges) ? mesh.edges.length : 0
    setMeshStats({ nodes: nodeCount, edges: edgeCount })
  }, [])

  const handleSearch = useCallback(async (
    query: string,
    filters: SearchFilters
  ) => {
    if (!address) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    setSearchError(null)
    setSearchResults(null)
    setIsSearchMode(true)
    setIsSearching(true)
    setSearchAnswer(null)
    setSearchCitations(null)

    try {
      const signal = abortControllerRef.current?.signal

      // Use the working /api/search endpoint for all searches
      console.log('Using unified search endpoint for query:', query)
      const response = await MemoryService.searchMemories(address, query, filters, 1, 50, signal)
      console.log('Search results:', response.results?.length, 'results')
      
      // Set all the response data immediately
      setSearchResults(response)
      setSearchAnswer(response.answer || null)
      setSearchMeta(response.meta_summary || null)
      setSearchCitations(response.citations || null)
      
      // Only set job_id for polling if we don't have an immediate answer
      if (response.job_id && !response.answer) {
        setSearchJobId(response.job_id)
      } else {
        setSearchJobId(null)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Search request was cancelled')
        return
      }
      setSearchError('Failed to search memories')
      console.error('Error searching memories:', err)
    } finally {
      setIsSearching(false)
    }
  }, [address])

  const handleClearSearch = useCallback(() => {
    setSearchResults(null)
    setSearchAnswer(null)
    setSearchMeta(null)
    setSearchJobId(null)
    setSearchCitations(null)
    setSearchError(null)
    setIsSearchMode(false)
    setIsSearching(false)
    setSearchQuery('')
  }, [])

  // Poll for async LLM answer if job id present (only if answer not already available)
  useEffect(() => {
    if (!searchJobId || searchAnswer) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const status = await SearchService.getJob(searchJobId)
        if (cancelled) return
        if (status.status === 'completed') {
          if (status.answer) setSearchAnswer(status.answer)
          clearInterval(interval)
          setSearchJobId(null)
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
    return () => { cancelled = true; clearInterval(interval) }
  }, [searchJobId, searchAnswer])

  const handleViewTransaction = useCallback((txHash: string, network: string) => {
    setSelectedTxHash(txHash)
    setSelectedNetwork(network)
    setShowTransactionDetails(true)
    showTransactionNotification(txHash, network)
  }, [showTransactionNotification])

  const handleCloseTransactionDetails = useCallback(() => {
    setShowTransactionDetails(false)
    setSelectedTxHash(null)
  }, [])

  const handleViewTransactionHistory = useCallback(() => {
    if (address) {
      setShowTransactionHistorySidebar(true)
    }
  }, [address])

  const handleCloseTransactionHistory = useCallback(() => {
    setShowTransactionHistorySidebar(false)
  }, [])

  // Filter results to show only cited memories
  const getFilteredMemories = () => {
    if (!isSearchMode || !searchResults || !searchResults.results) {
      return memories
    }
    
    if (!showOnlyCited || !searchCitations || searchCitations.length === 0) {
      return searchResults.results.map(r => r.memory)
    }
    
    // Get memory IDs from citations
    const citedMemoryIds = searchCitations.map(citation => citation.memory_id)
    
    // Filter results to only include cited memories
    return searchResults.results
      .filter(result => citedMemoryIds.includes(result.memory.id))
      .map(result => result.memory)
  }

  const handleViewAllTransactions = useCallback(() => {
    showAllTransactions('sepolia')
  }, [showAllTransactions])

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // If search query is empty, clear search immediately
    if (!searchQuery.trim()) {
      handleClearSearch()
      return
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      handleSearch(searchQuery.trim(), {})
    }, 500)

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [searchQuery, handleSearch, handleClearSearch])

  useEffect(() => {
    if (isConnected && address) {
      fetchMemories()
    }
  }, [isConnected, address, fetchMemories])

  // Cleanup effect to cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <WalletConnectionFlow />
        </div>
      </div>
    )
  }

  let currentMemories = getFilteredMemories()
  const currentResults = isSearchMode && searchResults && searchResults.results ? searchResults.results : null
  currentMemories = [...(currentMemories || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-sky-50/30">
      {/* Header */}
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
                [MEMORY MESH]
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {address && address.startsWith('0x') && address.length === 42 && (
                <>
                  <NetworkHealthIndicator network="sepolia" />
                  <button
                    onClick={handleViewTransactionHistory}
                    className="text-xs font-mono text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 border border-blue-200 hover:border-blue-300 transition-all duration-200"
                  >
                    [TX HISTORY]
                  </button>
                  <button
                    onClick={handleViewAllTransactions}
                    className="text-xs font-mono text-gray-600 hover:text-gray-800 bg-gray-50 px-3 py-1 border border-gray-200 hover:border-gray-300 transition-all duration-200"
                  >
                    [ALL TX]
                  </button>
                  <WalletStatus variant="compact" showActions={false} />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px-48px)]">
        {/* Left Panel - Memory Mesh */}
        <div className="flex-1 relative">
        <MemoryMesh 
          userAddress={address || undefined}
          className="w-full h-full"
          onNodeClick={handleNodeClick}
          similarityThreshold={similarityThreshold}
          selectedMemoryId={selectedMemory?.id}
          highlightedMemoryIds={isSearchMode && searchResults && searchResults.results ? searchResults.results.map(r => r.memory.id) : []}
          onMeshLoad={handleMeshLoad}
          memorySources={{
            ...Object.fromEntries(memories.map(m => [m.id, m.source || ''])),
            ...Object.fromEntries((searchResults?.results || []).map(r => [r.memory.id, r.memory.source || '']))
          }}
          memoryUrls={{
            ...Object.fromEntries(memories.map(m => [m.id, m.url || ''])),
            ...Object.fromEntries((searchResults?.results || []).map(r => [r.memory.id, r.memory.url || '']))
          }}
        />
      </div>

        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-200 border-r-0 rounded-l-lg px-2 py-4 hover:bg-gray-50 transition-all duration-200 shadow-sm"
        >
          <svg 
            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isSidebarCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Panel - Search & Memory List */}
        <div className={`${isSidebarCollapsed ? 'w-0' : 'w-[320px]'} border-l border-gray-200 bg-white flex flex-col transition-all duration-300 overflow-hidden`}>
          {/* Compact Controls */}
          <div className="border-b border-gray-200 bg-gray-50/50 flex-shrink-0 p-3">
            
            {/* Auto-search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={isSearching ? "Searching..." : "Search memories..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSearching}
                  className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isSearching 
                      ? 'border-blue-300 bg-blue-50 text-blue-700' 
                      : 'border-gray-200'
                  }`}
                />
                {isSearching && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSearchQuery('')
                  handleClearSearch()
                }}
                disabled={isSearching}
                className={`text-xs px-2 py-1.5 border rounded transition-colors ${
                  isSearching
                    ? 'text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Memory List Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-700">
                  {isSearchMode ? 'Search Results' : 'Memories'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isSearchMode ? (
                    isSearching ? (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Searching...
                      </span>
                    ) : (searchResults ? (
                      showOnlyCited && searchCitations && searchCitations.length > 0 ? 
                        `Showing ${currentMemories.length} cited memories (of ${searchResults.total} total) for "${searchQuery}"` :
                        `${searchResults.total} results for "${searchQuery}"`
                    ) : 'No search')
                  ) : (
                    `${(memories || []).length} total`
                  )}
                </p>
              </div>
              {selectedMemory && (
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            {isSearchMode && (isSearching || searchAnswer || searchMeta) && (
              <div className="mt-2 text-[11px] font-mono text-gray-800 bg-yellow-50 border border-yellow-200 p-2 rounded">
                {isSearching ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching and generating answer...</span>
                  </div>
                ) : (searchAnswer || searchMeta) ? (
                  <span>
                    {searchAnswer || searchMeta}
                  </span>
                ) : null}
                {searchCitations && searchCitations.length > 0 && (
                  <div className="mt-2 text-[11px] text-gray-700 gap-2 flex flex-wrap">
                    {searchCitations.slice(0,6).map(c => (
                      <button
                        key={c.label}
                        onClick={() => handleCitationClick(c.memory_id)}
                        className="underline decoration-dotted hover:text-blue-700 text-left"
                        title={c.title || c.url || ''}
                      >
                        [{c.label}] {c.title || 'Open memory'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Show Only Cited Memories Toggle */}
            {isSearchMode && searchCitations && searchCitations.length > 0 && (
              <div className="mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyCited}
                    onChange={(e) => setShowOnlyCited(e.target.checked)}
                    className="border-gray-300"
                  />
                  <span className="text-[11px] font-mono text-gray-700">
                    Show only cited memories ({searchCitations.length} cited)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Memory List */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-12 bg-gray-200 animate-pulse rounded"></div>
                ))}
              </div>
            ) : isSearching ? (
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 bg-blue-100 animate-pulse rounded border border-blue-200">
                    <div className="p-2">
                      <div className="h-3 bg-blue-200 rounded mb-1"></div>
                      <div className="h-2 bg-blue-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchMemories}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200"
                >
                  Retry
                </button>
              </div>
            ) : searchError ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-600 mb-4">{searchError}</p>
                <button
                  onClick={handleClearSearch}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200"
                >
                  Clear Search
                </button>
              </div>
            ) : (currentMemories || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                {isSearching ? (
                  <>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm text-gray-600">Searching memories...</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29-1.009-5.824-2.709" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      {isSearchMode ? (
                        showOnlyCited && searchCitations && searchCitations.length > 0 
                          ? 'No cited memories found' 
                          : 'No memories found matching your search'
                      ) : 'No memories found'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {(currentMemories || []).map((memory) => {
                  const searchResult = currentResults?.find(r => r.memory.id === memory.id)
                  return (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      isSelected={selectedMemory?.id === memory.id}
                      onSelect={handleSelectMemory}
                      onViewTransaction={handleViewTransaction}
                      searchResult={searchResult}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Memory Details Panel */}
        {selectedMemory && !isSidebarCollapsed && (
          <div className="w-[500px] border-l border-gray-200 bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Memory Details</h3>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <MemoryDetails
              memory={selectedMemory}
              expandedContent={expandedContent}
              setExpandedContent={setExpandedContent}
              onViewTransaction={handleViewTransaction}
            />
          </div>
        )}

        {/* Floating Memory Details Panel (when sidebar is collapsed) */}
        {selectedMemory && isSidebarCollapsed && (
          <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-[400px] max-h-[80vh] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Memory Details</h3>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MemoryDetails
                memory={selectedMemory}
                expandedContent={expandedContent}
                setExpandedContent={setExpandedContent}
                onViewTransaction={handleViewTransaction}
              />
            </div>
          </div>
        )}
      </div>

      {/* Memory Stats Overlay */}
      {/* {insights && (memories || []).length > 0 && (
        <div className="fixed bottom-16 left-4 bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl p-4 z-40">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
            [MEMORY STATS]
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <div className="text-gray-500">TOTAL</div>
              <div className="text-gray-900 font-semibold">{insights.total_memories}</div>
            </div>
            <div>
              <div className="text-gray-500">CONFIRMED</div>
              <div className="text-gray-900 font-semibold">{insights.confirmed_transactions}</div>
            </div>
            <div>
              <div className="text-gray-500">PENDING</div>
              <div className="text-gray-900 font-semibold">{insights.pending_transactions}</div>
            </div>
            <div>
              <div className="text-gray-500">NODES</div>
              <div className="text-gray-900 font-semibold">{insights.total_memories}</div>
            </div>
          </div>
        </div>
      )} */}

      {/* Bottom System Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {insights && (
          <div className="bg-white/95 border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-center gap-6 text-xs font-mono">
              <span className="text-gray-700">[ Total Memories: <span className="text-sky-600">{insights.total_memories}</span> ]</span>
              <span className="text-gray-700">[ Verified: <span className="text-emerald-600">{insights.confirmed_transactions}</span> ]</span>
              <span className="text-gray-700">[ Relationships: <span className="text-violet-600">{meshStats.edges}</span> ]</span>
              <span className="text-green-600">[ Embeddings Synced ]</span>
            </div>
          </div>
        )}
        <WalletStatusBar />
      </div>

      {/* Transaction Details Overlay */}
      {showTransactionDetails && selectedTxHash && (
        <TransactionDetailsOverlay
          txHash={selectedTxHash}
          network={selectedNetwork}
          isOpen={showTransactionDetails}
          onClose={handleCloseTransactionDetails}
        />
      )}

      {/* Transaction History Sidebar */}
      {showTransactionHistorySidebar && address && (
        <TransactionHistorySidebar
          address={address}
          network="sepolia"
          isOpen={showTransactionHistorySidebar}
          onClose={handleCloseTransactionHistory}
        />
      )}

      {/* Gas Deposit Section */}
      {isConnected && gasBalance && parseFloat(gasBalance) < 0.005 && (
        <div className="fixed bottom-4 right-4 z-50">
          <WalletStatus variant="expanded" showActions={true} className="max-w-sm" />
        </div>
      )}

      {/* Node Detail Overlay */}
      <Dialog open={isNodeModalOpen} onOpenChange={setIsNodeModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-wide">[MEMORY DETAILS]</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <MemoryDetails
              memory={selectedMemory}
              expandedContent={expandedContent}
              setExpandedContent={setExpandedContent}
              onViewTransaction={handleViewTransaction}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}