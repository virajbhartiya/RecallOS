import React, { useState, useCallback, useEffect, useRef } from 'react'
 
 
import { MemoryService } from '@/services/memoryService'
import { MemoryMesh3D } from '@/components/MemoryMesh3D'
import { SearchService } from '@/services/search'
 
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
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [expandedContent, setExpandedContent] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [listSearchQuery, setListSearchQuery] = useState('')
  const [dialogSearchResults, setDialogSearchResults] = useState<MemorySearchResponse | null>(null)
  const [dialogSearchAnswer, setDialogSearchAnswer] = useState<string | null>(null)
  const [dialogSearchMeta, setDialogSearchMeta] = useState<string | null>(null)
  const [dialogSearchCitations, setDialogSearchCitations] = useState<Array<{ label: number; memory_id: string; title: string | null; url: string | null }> | null>(null)
  const [dialogSearchJobId, setDialogSearchJobId] = useState<string | null>(null)
  const [dialogIsSearching, setDialogIsSearching] = useState(false)
  const dialogAbortControllerRef = useRef<AbortController | null>(null)
  const dialogDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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

  // Track viewport for responsive behavior (no sidebars now)
  useEffect(() => {}, [])

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
      setIsDialogOpen(true)
      setListSearchQuery('')
      setDialogSearchResults(null)
      setDialogSearchAnswer(null)
      setDialogSearchMeta(null)
      setDialogSearchCitations(null)
    }
    
    // Visual feedback - highlight the clicked node
    setClickedNodeId(memoryId)
  }

  const selectMemoryById = useCallback((memoryId: string) => {
    const mem = memories.find(m => m.id === memoryId) || dialogSearchResults?.results?.find(r => r.memory.id === memoryId)?.memory
    if (mem) {
      setSelectedMemory(mem)
      setClickedNodeId(mem.id)
      setExpandedContent(false)
    }
  }, [memories, dialogSearchResults])

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

  

  // Dialog search handler
  const handleDialogSearch = useCallback(async (query: string) => {
    if (!userId || !query.trim()) {
      setDialogSearchResults(null)
      setDialogSearchAnswer(null)
      setDialogSearchMeta(null)
      setDialogSearchCitations(null)
      setDialogIsSearching(false)
      return
    }

    // Cancel any existing search
    if (dialogAbortControllerRef.current) {
      dialogAbortControllerRef.current.abort()
    }

    dialogAbortControllerRef.current = new AbortController()
    setDialogIsSearching(true)

    try {
      const signal = dialogAbortControllerRef.current?.signal
      await getOrCreateAuthToken()

      const response = await MemoryService.searchMemories(userId, query, {}, 1, 50, signal)
      
      if (signal?.aborted) return
      
      setDialogSearchResults(response)
      setDialogSearchAnswer(response.answer || null)
      setDialogSearchMeta(response.meta_summary || null)
      setDialogSearchCitations(response.citations || null)
      
      if (response.job_id && !response.answer) {
        setDialogSearchJobId(response.job_id)
      } else {
        setDialogSearchJobId(null)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      // Error handling - could show error state here if needed
    } finally {
      if (!dialogAbortControllerRef.current?.signal.aborted) {
        setDialogIsSearching(false)
      }
    }
  }, [userId])

  // Debounced dialog search effect
  useEffect(() => {
    if (dialogDebounceTimeoutRef.current) {
      clearTimeout(dialogDebounceTimeoutRef.current)
    }

    if (!listSearchQuery.trim()) {
      setDialogSearchResults(null)
      setDialogSearchAnswer(null)
      setDialogSearchMeta(null)
      setDialogSearchCitations(null)
      return
    }

    dialogDebounceTimeoutRef.current = setTimeout(() => {
      if (listSearchQuery.trim()) {
        handleDialogSearch(listSearchQuery.trim())
      }
    }, 800)

    return () => {
      if (dialogDebounceTimeoutRef.current) {
        clearTimeout(dialogDebounceTimeoutRef.current)
      }
    }
  }, [listSearchQuery, handleDialogSearch])

  // Poll for async LLM answer in dialog
  useEffect(() => {
    if (!dialogSearchJobId || dialogSearchAnswer) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const status = await SearchService.getJob(dialogSearchJobId)
        if (cancelled) return
        if (status.status === 'completed') {
          if (status.answer) setDialogSearchAnswer(status.answer)
          if (status.meta_summary) setDialogSearchMeta(status.meta_summary)
          clearInterval(interval)
          setDialogSearchJobId(null)
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
    return () => { cancelled = true; clearInterval(interval) }
  }, [dialogSearchJobId, dialogSearchAnswer])

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
      if (dialogAbortControllerRef.current) {
        dialogAbortControllerRef.current.abort()
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
              <div className="flex items-center justify-between mb-2">
                <span className="uppercase tracking-wide text-gray-600">Legend</span>
                <button
                  onClick={() => {
                    setIsDialogOpen(true)
                    setListSearchQuery('')
                    setDialogSearchResults(null)
                    setDialogSearchAnswer(null)
                    setDialogSearchMeta(null)
                    setDialogSearchCitations(null)
                    setSelectedMemory(null)
                    setClickedNodeId(null)
                  }}
                  className="text-[10px] font-mono text-blue-600 hover:text-black bg-blue-50 px-2 py-1 border border-blue-200 hover:border-black transition-all"
                >
                  Browse
                </button>
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

        {/* Memory Dialog */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsDialogOpen(false)}>
            <div className="bg-white border border-gray-200 shadow-lg w-[1200px] h-[800px] max-w-[95vw] max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Memory Details</h2>
                <button
                  onClick={() => { setIsDialogOpen(false); setSelectedMemory(null); setClickedNodeId(null) }}
                  className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left: Searchable List */}
                <div className="w-80 border-r border-gray-200 flex flex-col">
                  <div className="p-3 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search memories..."
                      value={listSearchQuery}
                      onChange={(e) => setListSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {dialogIsSearching && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Searching...
                      </div>
                    )}
                    {!dialogIsSearching && listSearchQuery.trim() && dialogSearchResults && dialogSearchResults.results && dialogSearchResults.results.length > 0 ? (
                      dialogSearchResults.results.map((result) => (
                        <button
                          key={result.memory.id}
                          onClick={() => {
                            setSelectedMemory(result.memory)
                            setClickedNodeId(result.memory.id)
                            setExpandedContent(false)
                          }}
                          className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            selectedMemory?.id === result.memory.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {result.memory.title || 'Untitled Memory'}
                            </div>
                            {result.blended_score !== undefined && (
                              <span className="text-[10px] text-gray-500 font-mono ml-2 flex-shrink-0">
                                {(result.blended_score * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {result.memory.created_at ? new Date(result.memory.created_at).toLocaleDateString() : 'NO DATE'} • {result.memory.source || 'UNKNOWN'}
                          </div>
                          {result.memory.summary && (
                            <div className="text-[10px] text-gray-600 mt-1 line-clamp-2">
                              {result.memory.summary}
                            </div>
                          )}
                        </button>
                      ))
                    ) : !dialogIsSearching && listSearchQuery.trim() && dialogSearchResults && dialogSearchResults.results && dialogSearchResults.results.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No results found
                      </div>
                    ) : !listSearchQuery.trim() ? (
                      memories
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((memory) => (
                          <button
                            key={memory.id}
                            onClick={() => {
                              setSelectedMemory(memory)
                              setClickedNodeId(memory.id)
                              setExpandedContent(false)
                            }}
                            className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              selectedMemory?.id === memory.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="text-xs font-medium text-gray-900 truncate mb-1">
                              {memory.title || 'Untitled Memory'}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'NO DATE'} • {memory.source || 'UNKNOWN'}
                            </div>
                          </button>
                        ))
                    ) : null}
                  </div>
                </div>

                {/* Right: Details */}
                <div className="flex-1 overflow-y-auto p-6">
                  {listSearchQuery.trim() && dialogSearchResults && (
                    <div className="space-y-4 mb-6">
                      {dialogSearchAnswer && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                          <div className="text-xs font-mono text-blue-600 uppercase tracking-wide mb-2">Answer</div>
                          <p className="text-sm text-gray-800 leading-relaxed break-words whitespace-pre-wrap">
                            {dialogSearchAnswer}
                          </p>
                        </div>
                      )}
                      {dialogSearchMeta && (
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded">
                          <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Meta Summary</div>
                          <p className="text-sm text-gray-800 leading-relaxed break-words">
                            {dialogSearchMeta}
                          </p>
                        </div>
                      )}
                      {dialogSearchCitations && dialogSearchCitations.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded">
                          <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Citations</div>
                          <div className="space-y-2">
                            {dialogSearchCitations.map((citation, idx) => {
                              const title = citation.title || 'Untitled Memory'
                              const url = citation.url && citation.url !== 'unknown' ? citation.url : null
                              return (
                                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-gray-500">[{citation.label ?? idx + 1}]</span>
                                    {url ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={title}
                                        className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                                      >
                                        {title}
                                      </a>
                                    ) : (
                                      <button
                                        title={title}
                                        onClick={() => selectMemoryById(citation.memory_id)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline truncate text-left"
                                      >
                                        {title}
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => selectMemoryById(citation.memory_id)}
                                    className="text-gray-500 hover:text-gray-800 whitespace-nowrap"
                                  >
                                    Open
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedMemory ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-mono text-gray-500 flex items-center gap-2 mb-2">
                          <span>{selectedMemory.created_at ? new Date(selectedMemory.created_at).toLocaleDateString() : 'NO DATE'}</span>
                          {selectedMemory.source && (
                            <span className="inline-flex items-center gap-1 uppercase bg-gray-100 px-2 py-0.5 border border-gray-200 text-gray-700">{selectedMemory.source}</span>
                          )}
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 leading-snug break-words mb-4">
                          {selectedMemory.title || 'Untitled Memory'}
                        </h3>
                      </div>

                      {selectedMemory.summary ? (
                        <div>
                          <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-2">Summary</div>
                          <p className="text-sm text-gray-800 leading-relaxed break-words">
                            {selectedMemory.summary}
                          </p>
                        </div>
                      ) : selectedMemory.content ? (
                        <div>
                          <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-2">Content</div>
                          <p className={`text-sm text-gray-800 leading-relaxed break-words ${expandedContent ? '' : 'line-clamp-10'}`}>
                            {selectedMemory.content}
                          </p>
                          {selectedMemory.content && selectedMemory.content.length > 500 && (
                            <button
                              onClick={() => setExpandedContent(!expandedContent)}
                              className="mt-2 text-xs font-mono text-blue-600 hover:text-black bg-blue-50 px-2 py-1 border border-blue-200 hover:border-black transition-all"
                            >
                              {expandedContent ? 'Collapse' : 'Expand'}
                            </button>
                          )}
                        </div>
                      ) : null}

                      {selectedMemory.url && selectedMemory.url !== 'unknown' && (
                        <div>
                          <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-2">Source</div>
                          <a
                            href={selectedMemory.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 break-all hover:underline"
                          >
                            {selectedMemory.url}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : listSearchQuery.trim() && dialogSearchResults && (dialogSearchAnswer || dialogSearchMeta || (dialogSearchCitations && dialogSearchCitations.length > 0)) ? (
                    // When search results are shown but no memory selected, don't show message
                    null
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">
                      {listSearchQuery.trim() ? 'Select a memory from search results' : 'Select a memory from the list'}
                    </div>
                  )}
                </div>
              </div>
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

      

      

    </div>
  )
}