import React, { useState, useCallback, useEffect, useRef } from 'react'
 
 
import { MemoryService } from '@/services/memoryService'
import { SearchService } from '@/services/search'
import { MemoryMesh3D } from '@/components/MemoryMesh3D'
 
// removed unused Database import
import type { Memory, SearchFilters, MemorySearchResponse } from '@/types/memory'
import { getOrCreateUserId, getOrCreateAuthToken } from '@/utils/userId'

const MemoryCard: React.FC<{
  memory: Memory
  isSelected: boolean
  onSelect: (memory: Memory) => void
  onViewTransaction?: (txHash: string, network: string) => void
  searchResult?: {
    search_type?: 'keyword' | 'semantic' | 'hybrid'
    blended_score?: number
  }
  hyperIndexData?: {
    blockNumber?: string
    gasUsed?: string
    gasPrice?: string
  }
}> = ({ memory, isSelected, onSelect, onViewTransaction: _onViewTransaction, searchResult, hyperIndexData }) => {
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
        {hyperIndexData?.blockNumber && (
          <>
            <span>•</span>
            <span className="text-blue-600">Block {hyperIndexData.blockNumber}</span>
          </>
        )}
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
  hyperIndexData?: {
    blockNumber?: string
    gasUsed?: string
    gasPrice?: string
    timestamp?: string
  }
}> = ({ memory, expandedContent, setExpandedContent, onViewTransaction: _onViewTransaction, hyperIndexData: _hyperIndexData }) => {
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
          <h3 className="text-lg sm:text-xl font-light text-gray-900 mb-3 leading-tight break-words overflow-wrap-anywhere">
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
        <div className="flex flex-col gap-4 mb-6">
          {memory.importance_score && (
            <div className="flex flex-col gap-2">
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
              <p className="text-sm text-gray-700 leading-relaxed break-words overflow-wrap-anywhere">
                {memory.summary}
              </p>
            </div>
          </div>
        )}

        {memory.content && (
          <div className="mb-6">
            <div className="flex flex-col gap-2 mb-3">
              <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide">[CONTENT]</h4>
              <button
                onClick={() => setExpandedContent(!expandedContent)}
                className="text-sm font-mono text-blue-600 hover:text-black bg-blue-50 px-3 py-1 border border-blue-200 hover:border-black transition-all duration-200 w-fit"
              >
                {expandedContent ? '[COLLAPSE]' : '[EXPAND]'}
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
              <p className={`text-sm text-gray-700 leading-relaxed break-words overflow-wrap-anywhere ${expandedContent ? '' : 'line-clamp-6'}`}>
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
                className="text-sm text-blue-600 hover:text-blue-800 break-all hover:underline overflow-wrap-anywhere"
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
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
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
  const userId = getOrCreateUserId()
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
  const [hyperIndexData, _setHyperIndexData] = useState<Record<string, any>>({})
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

  const fetchHyperIndexData = useCallback(async (_memoriesData: Memory[]) => {
    return
  }, [])

  const fetchMemories = useCallback(async () => {
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Ensure we have an auth token before making requests
      await getOrCreateAuthToken()
      
      const memoriesData = await MemoryService.getMemoriesWithTransactionDetails(userId)
      
      setMemories(memoriesData || [])
      
      // Fetch HyperIndex data in parallel
      if (memoriesData && memoriesData.length > 0) {
        fetchHyperIndexData(memoriesData)
      }
      
      
    } catch (err) {
      setError('Failed to fetch memories')
      // Error fetching memories
    } finally {
      setIsLoading(false)
    }
  }, [userId, fetchHyperIndexData])

  const handleSelectMemory = (memory: Memory) => {
    // Enable memory selection from the list and highlight in mesh
    setSelectedMemory(memory)
    setExpandedContent(false)
    setClickedNodeId(memory.id)
  }

  const handleNodeClick = (memoryId: string) => {
    
    // Find the memory information
    const memoryInfo = memories.find(m => m.id === memoryId)
    if (memoryInfo) {
      setSelectedMemory(memoryInfo)
      setExpandedContent(false)
    }
    
    // Visual feedback - highlight the clicked node
    setClickedNodeId(memoryId)
  }

  const handleCitationClick = (memoryId: string) => {
    // Select and highlight a memory from citations
    const memoryInfo = memories.find(m => m.id === memoryId)
    if (memoryInfo) {
      setSelectedMemory(memoryInfo)
      setExpandedContent(false)
    }
    setClickedNodeId(memoryId)
  }

  

  const handleSearch = useCallback(async (
    query: string,
    filters: SearchFilters
  ) => {
    if (!userId || !query.trim()) return

    // Cancel any existing search
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

      // Ensure we have an auth token before making requests
      await getOrCreateAuthToken()

      // Use the working /api/search endpoint for all searches
      const response = await MemoryService.searchMemories(userId, query, filters, 1, 50, signal)
      
      // Check if the search was aborted before setting results
      if (signal?.aborted) return
      
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
        return
      }
      // Only set error if not aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setSearchError('Failed to search memories')
      }
    } finally {
      // Only set searching to false if not aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [userId])

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

  const handleViewTransaction = useCallback((_txHash: string, _network: string) => {
    return
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
      // Only search if the query is still non-empty (user hasn't cleared it)
      if (searchQuery.trim()) {
        handleSearch(searchQuery.trim(), {})
      }
    }, 800) // Increased debounce time to 800ms for better UX

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchQuery, handleSearch, handleClearSearch])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  // Cleanup effect to cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  

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
                [Memory Mesh]
              </div>
              {/* Mobile toggle for sidebar */}
              <button
                onClick={() => setIsSidebarCollapsed((v) => !v)}
                className="md:hidden text-xs font-mono text-gray-600 hover:text-black bg-white px-2 py-1 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                {isSidebarCollapsed ? '[SHOW]' : '[HIDE]'}
              </button>
            </div>
            <div className="flex items-center space-x-4"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-65px)] relative">
        {/* Left Panel - Memory Mesh */}
        <div
          className="flex-1 relative order-2 md:order-1 h-[50vh] md:h-auto md:min-h-[calc(100vh-65px)] border-b md:border-b-0 bg-white"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            backgroundPosition: '0 0',
          }}
        >

          {/* 3D Memory Mesh Canvas */}
          <MemoryMesh3D 
            userAddress={userId || undefined}
            className="w-full h-full"
            onNodeClick={handleNodeClick}
            similarityThreshold={similarityThreshold}
            selectedMemoryId={clickedNodeId || undefined}
            highlightedMemoryIds={[
              ...(isSearchMode && searchResults && searchResults.results ? searchResults.results.map(r => r.memory.id) : []),
              ...(clickedNodeId ? [clickedNodeId] : []),
              ...(selectedMemory ? [selectedMemory.id] : [])
            ]}
            memorySources={{
              ...Object.fromEntries(memories.map(m => [m.id, m.source || ''])),
              ...Object.fromEntries((searchResults?.results || []).map(r => [r.memory.id, r.memory.source || '']))
            }}
            memoryUrls={{
              ...Object.fromEntries(memories.map(m => [m.id, m.url || ''])),
              ...Object.fromEntries((searchResults?.results || []).map(r => [r.memory.id, r.memory.url || '']))
            }}
          />

          {/* Corner brand/label */}
          <div className="pointer-events-none absolute left-4 top-3 text-[11px] font-semibold tracking-tight text-gray-500">
            memory mesh
          </div>

          {/* Legend Overlay (top-right, light) */}
          <div className="absolute right-4 top-3 z-20 max-w-[220px] text-[11px]">
            <div className="bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-700 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wide text-gray-600">Legend</span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="space-y-1">
                  <div className="text-gray-500">Statistics</div>
                  <div className="flex items-center justify-between">
                    <span>Memories</span>
                    <span className="font-mono">{memories.length}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Nodes</div>
                  <div className="grid grid-cols-2 gap-x-3">
                    <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Document</span>
                    <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Memory</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Connections</div>
                  <div className="grid grid-cols-2 gap-x-3">
                    <span className="flex items-center gap-2"><span className="inline-block w-4 h-[1px] bg-gray-400" /> Doc → Memory</span>
                    <span className="flex items-center gap-2"><span className="inline-block w-4 h-[1px] bg-blue-400" /> Similarity</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Similarity</div>
                  <div className="grid grid-cols-2 gap-x-3">
                    <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-gray-300" /> Weak</span>
                    <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-gray-700" /> Strong</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden md:block fixed right-[300px] top-1/2 transform -translate-y-1/2 z-40 bg-white border border-gray-200 border-r-0 rounded-l px-2 py-4 hover:bg-gray-50 transition-all duration-200 shadow-sm ${isSidebarCollapsed ? 'translate-x-[300px]' : ''}`}
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

        {/* Right Panel - Search & Memory List (overlay) */}
        <div className={`fixed inset-y-0 right-0 ${isSidebarCollapsed ? 'translate-x-full' : 'translate-x-0'} w-[300px] md:w-[300px] border-l border-gray-200 bg-white flex flex-col transition-transform duration-300 overflow-hidden z-30 shadow-sm`}> 
          {/* Search Controls */}
          <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0 p-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={isSearching ? "Searching..." : "Search memories..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    // Don't disable input while searching to allow continued typing
                  }}
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
                  // Cancel any pending search
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                  }
                  setSearchQuery('')
                  handleClearSearch()
                }}
                className="text-xs px-3 py-2 border font-mono uppercase tracking-wide transition-colors text-gray-600 hover:text-black border-gray-200 hover:bg-gray-100"
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
            <div className="max-w-[268px] mx-auto w-full">
            {isLoading ? (
              <div className="space-y-2 w-full flex flex-col items-center">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="w-[92%] text-left p-3 bg-gray-100 animate-pulse border border-gray-200 mx-auto">
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
              <div className="space-y-3 w-full flex flex-col items-center">
                {/* Search Status */}
                <div className="bg-blue-50 border border-blue-200 p-3 rounded w-[92%] mx-auto">
                  <div className="flex items-center gap-2 text-sm text-blue-700 justify-center">
                    <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    <span className="truncate">Querying memories...</span>
                  </div>
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
                  const memoryHyperIndexData = hyperIndexData[memory.tx_hash || memory.id]
                  return (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      isSelected={selectedMemory?.id === memory.id}
                      onSelect={handleSelectMemory}
                      onViewTransaction={handleViewTransaction}
                      searchResult={searchResult}
                      hyperIndexData={memoryHyperIndexData}
                    />
                  )
                })}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Memory Details Sidebar */}
        {selectedMemory && (() => {
          return true
        })() && (
          <div className="fixed inset-y-0 left-0 w-[400px] md:w-[450px] lg:w-[500px] border-r border-gray-200 bg-white/95 backdrop-blur-sm flex flex-col max-h-full z-30 shadow-sm">
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
              hyperIndexData={selectedMemory ? hyperIndexData[selectedMemory.tx_hash || selectedMemory.id] : undefined}
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

      

      

    </div>
  )
}