import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { WalletStatus } from '@/components/WalletStatus'
import { WalletConnectionFlow } from '@/components/WalletConnectionFlow'
 
import { MemoryService } from '@/services/memoryService'
import { SearchService } from '@/services/search'
import { MemoryMesh } from '@/components/MemoryMesh'
import { useBlockscout } from '@/hooks/useBlockscout'
import { TransactionStatusIndicator } from '@/components/TransactionStatusIndicator'
import type { Memory, SearchFilters, MemorySearchResponse } from '@/types/memory'

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
      className={`w-full text-left p-3 transition-all duration-200 group border ${
        isSelected
          ? 'bg-blue-50 border-blue-200'
          : 'hover:bg-gray-50 border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-medium text-gray-900 truncate group-hover:text-black transition-colors flex items-center gap-2">
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
      
      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1.5 font-mono">
        <span>{memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'No date'}</span>
        <span>•</span>
        <span className="uppercase">{memory.source}</span>
      </div>
      
      {(memory.summary || memory.content) && (
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {memory.summary || (memory.content && memory.content.slice(0, 80) + (memory.content.length > 80 ? '...' : ''))}
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
          <p className="text-sm font-mono text-gray-500">Click a node in the latent space to view its details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6">
        {/* Header Section */}
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl font-light text-gray-900 mb-3 leading-tight break-words">
            {memory.title || 'Untitled Memory'}
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm font-mono text-gray-500">
            <span>{memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'NO DATE'}</span>
            {memory.source && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono uppercase text-xs bg-gray-100 px-2 py-1 border border-gray-200 w-fit">
                  [{memory.source}]
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status and Importance Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {memory.tx_status && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-mono text-gray-600">[STATUS]</span>
              <div className="flex items-center gap-2">
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
                      className="text-xs font-mono text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 border border-blue-200 hover:border-blue-300 transition-all duration-200 whitespace-nowrap"
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
            </div>
          )}
          {memory.importance_score && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
            <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
              <p className="text-sm text-gray-700 leading-relaxed break-words">
                {memory.summary}
              </p>
            </div>
          </div>
        )}

        {memory.content && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide">[CONTENT]</h4>
              <button
                onClick={() => setExpandedContent(!expandedContent)}
                className="text-sm font-mono text-blue-600 hover:text-black bg-blue-50 px-3 py-1 border border-blue-200 hover:border-black transition-all duration-200 w-fit"
              >
                {expandedContent ? '[COLLAPSE]' : '[EXPAND]'}
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
              <p className={`text-sm text-gray-700 leading-relaxed break-words ${expandedContent ? '' : 'line-clamp-6'}`}>
                {memory.content}
              </p>
            </div>
          </div>
        )}

        {memory.url && memory.url !== 'unknown' && (
          <div className="mb-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[SOURCE URL]</h4>
            <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
              <a
                href={memory.url} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 break-all hover:underline"
              >
                {memory.url}
              </a>
            </div>
          </div>
        )}

        {memory.page_metadata && (
          <div className="mb-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[METADATA]</h4>
            <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4 overflow-x-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
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
  const { isConnected, address } = useWallet()
  const { showTransactionNotification, prefetchTransaction } = useBlockscout()
  const [memories, setMemories] = useState<Memory[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const similarityThreshold = 0.3
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [expandedContent, setExpandedContent] = useState(false)
  
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

  // Track viewport for responsive behavior
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768
      setIsSidebarCollapsed(mobile) // auto-collapse on mobile
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const fetchMemories = useCallback(async () => {
    if (!address) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const memoriesData = await MemoryService.getMemoriesWithTransactionDetails(address)
      
      setMemories(memoriesData || [])
      
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
    // Enable memory selection from the list
    setSelectedMemory(memory)
    setExpandedContent(false)
  }

  const handleNodeClick = (memoryId: string) => {
    console.log('handleNodeClick called with:', memoryId)
    console.log('Setting clickedNodeId to:', memoryId)
    
    // Find the memory information
    const memoryInfo = memories.find(m => m.id === memoryId)
    if (memoryInfo) {
      setSelectedMemory(memoryInfo)
      setExpandedContent(false)
    }
    
    // Visual feedback - highlight the clicked node
    setClickedNodeId(memoryId)
    
    // Clear the highlight after 3 seconds (but keep sidebar open)
    setTimeout(() => {
      console.log('Clearing clickedNodeId')
      setClickedNodeId(null)
    }, 3000)
  }

  const handleCitationClick = (_memoryId: string) => {
    // Disabled - no action on citation click
  }

  

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
    showTransactionNotification(txHash, network)
  }, [showTransactionNotification])

  

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <button 
                onClick={() => window.location.href = '/'}
                className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
              >
                [← HOME]
              </button>
              <div className="text-xs sm:text-sm font-mono text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-1 border border-blue-200">
                [LATENT SPACE]
              </div>
              {/* Mobile toggle for sidebar */}
              <button
                onClick={() => setIsSidebarCollapsed((v) => !v)}
                className="md:hidden text-xs font-mono text-gray-600 hover:text-black bg-white px-2 py-1 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                {isSidebarCollapsed ? '[SHOW]' : '[HIDE]'}
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {address && address.startsWith('0x') && address.length === 42 && (
                <WalletStatus variant="compact" showActions={true} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-65px)]">
        {/* Left Panel - Memory Mesh */}
        <div className="flex-1 relative order-2 md:order-1 h-[50vh] md:h-auto bg-white border-b md:border-b-0 md:border-r border-gray-200">
        <MemoryMesh 
          userAddress={address || undefined}
          className="w-full h-full"
          onNodeClick={handleNodeClick}
          similarityThreshold={similarityThreshold}
          selectedMemoryId={clickedNodeId || undefined}
          highlightedMemoryIds={isSearchMode && searchResults && searchResults.results ? searchResults.results.map(r => r.memory.id) : []}
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
          className={`hidden md:block absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-200 border-r-0 rounded-l px-2 py-4 hover:bg-gray-50 transition-all duration-200 shadow-sm`}
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
        <div className={`${isSidebarCollapsed ? 'h-0 md:h-auto w-full md:w-0' : 'h-[50vh] md:h-auto w-full md:w-[360px]'} order-1 md:order-2 border-b md:border-b-0 md:border-l border-gray-200 bg-white flex flex-col transition-all duration-300 overflow-hidden`}> 
          {/* Search Controls */}
          <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0 p-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={isSearching ? "Searching..." : "Search memories..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSearching}
                  className={`w-full text-xs px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-black bg-white ${
                    isSearching 
                      ? 'border-blue-300 text-gray-700' 
                      : 'border-gray-200 text-gray-900'
                  }`}
                />
                {isSearching && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSearchQuery('')
                  handleClearSearch()
                }}
                disabled={isSearching}
                className={`text-xs px-3 py-2 border font-mono uppercase tracking-wide transition-colors ${
                  isSearching
                    ? 'text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'text-gray-600 hover:text-black border-gray-200 hover:bg-gray-100'
                }`}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Memory List Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wide text-gray-600">
                  {isSearchMode ? '[SEARCH RESULTS]' : '[MEMORIES]'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
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
            </div>
            {isSearchMode && (searchAnswer || searchMeta) && !isSearching && (
              <div className="mt-3 text-[11px] bg-blue-50 border border-blue-200 p-3 rounded">
                <div className="space-y-2">
                  <span className="block">
                    {searchAnswer || searchMeta}
                  </span>
                  {searchCitations && searchCitations.length > 0 && (
                    <div className="text-[11px] text-gray-700 gap-2 flex flex-wrap">
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
          <div className="flex-1 overflow-y-auto p-3 w-full">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="w-full text-left p-3 bg-gray-100 animate-pulse border border-gray-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <div className="h-3 bg-gray-300 rounded w-32"></div>
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <div className="h-2 bg-gray-300 rounded w-4"></div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-300 rounded w-full mb-1"></div>
                    <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : isSearching ? (
              <div className="space-y-3 w-full">
                {/* Search Status */}
                <div className="bg-blue-50 border border-blue-200 p-3 rounded w-full">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    <span className="truncate">Querying memories...</span>
                  </div>
                </div>
                {/* Search Result Placeholders */}
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="w-full text-left p-3 bg-blue-50 animate-pulse border border-blue-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>
                          <div className="h-3 bg-blue-100 rounded w-32"></div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>
                          <div className="h-2 bg-blue-100 rounded w-4"></div>
                        </div>
                      </div>
                      <div className="h-2 bg-blue-100 rounded w-full mb-1"></div>
                      <div className="h-2 bg-blue-100 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
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
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
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
              <div className="space-y-2">
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

        {/* Memory Details Sidebar */}
        {selectedMemory && (() => {
          console.log('Rendering sidebar for memory:', selectedMemory.id, selectedMemory.title)
          return true
        })() && (
          <div className="w-full md:w-[400px] lg:w-[480px] border-l border-gray-200 bg-white flex flex-col max-h-full">
            <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wide text-gray-600">[MEMORY DETAILS]</h3>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all duration-200 flex-shrink-0"
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

      

      {/* Gas Deposit Section */}
      

    </div>
  )
}