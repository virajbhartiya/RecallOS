import React, { useState, useCallback, useEffect, useRef } from 'react'
 
 
import { MemoryService } from '@/services/memoryService'
import { MemoryMesh3D } from '@/components/MemoryMesh3D'
import { SearchService } from '@/services/search'
import { PendingJobsPanel } from '@/components/PendingJobsPanel'
 
// removed unused Database import
import type { Memory, SearchFilters, MemorySearchResponse } from '@/types/memory'
import { getUserId, requireAuthToken } from '@/utils/userId'
import { useNavigate } from 'react-router-dom'

export const Memories: React.FC = () => {
  const navigate = useNavigate()
  const [memories, setMemories] = useState<Memory[]>([])
  const [totalMemoryCount, setTotalMemoryCount] = useState<number>(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  useEffect(() => {
    try {
      const id = getUserId()
      setUserId(id)
      setIsAuthenticated(true)
    } catch (error) {
      navigate('/login')
    }
  }, [navigate])
  
  
  const similarityThreshold = 0.3
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [expandedContent, setExpandedContent] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPendingJobsOpen, setIsPendingJobsOpen] = useState(false)
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
  
  const [searchJobId, setSearchJobId] = useState<string | null>(null)
  const [searchCitations, setSearchCitations] = useState<Array<{ label: number; memory_id: string; title: string | null; url: string | null }> | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showOnlyCited] = useState(true)
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Track viewport for responsive behavior (no sidebars now)
  useEffect(() => {}, [])

  const fetchHyperIndexData = useCallback(async (_memoriesData: Memory[]) => {
    return
  }, [])

  const fetchMemories = useCallback(async () => {
    if (!userId) return
    
    try {
      // Require authentication
      requireAuthToken()
      
      const [memoriesData, totalCount] = await Promise.all([
        MemoryService.getMemoriesWithTransactionDetails(userId, undefined, 10000),
        MemoryService.getUserMemoryCount(userId)
      ])
      
      setMemories(memoriesData || [])
      setTotalMemoryCount(totalCount || 0)
      
      // Fetch HyperIndex data in parallel
      if (memoriesData && memoriesData.length > 0) {
        fetchHyperIndexData(memoriesData)
      }
      
      
    } catch (err) {
      console.error('Error fetching memories:', err)
    } finally {
      
    }
  }, [userId, fetchHyperIndexData])

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

    setSearchResults(null)
    setIsSearchMode(true)
    setSearchAnswer(null)
    setSearchCitations(null)

    try {
      const signal = abortControllerRef.current?.signal

      // Require authentication
      requireAuthToken()

      // Use the working /api/search endpoint for all searches
      const response = await MemoryService.searchMemories(userId, query, filters, 1, 50, signal)
      
      // Check if the search was aborted before setting results
      if (signal?.aborted) return
      
      // Set all the response data immediately
      setSearchResults(response)
      setSearchAnswer(response.answer || null)
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
        
      }
    } finally {
      // Only set searching to false if not aborted
      if (!abortControllerRef.current?.signal.aborted) {
        
      }
    }
  }, [userId])

  const handleClearSearch = useCallback(() => {
    setSearchResults(null)
    setSearchAnswer(null)
    setSearchJobId(null)
    setSearchCitations(null)
    setIsSearchMode(false)
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
      requireAuthToken()

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

  if (!isAuthenticated || !userId) {
    return null
  }

  let currentMemories = getFilteredMemories()
  currentMemories = [...(currentMemories || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="min-h-screen bg-white" style={{
      backgroundImage: 'linear-gradient(135deg, #f9fafb, #ffffff, #f3f4f6)',
    }}>
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button 
                onClick={() => window.location.href = '/'}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
              >
                <span className="relative z-10">← Home</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">R</div>
                <div className="text-sm font-medium text-gray-900">Memory Mesh</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPendingJobsOpen(true)}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Pending Jobs
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-16 sm:h-20" aria-hidden="true" />

      {/* Main Content */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] relative">
        {/* Left Panel - Memory Mesh */}
        <div
          className="flex-1 relative order-2 md:order-1 h-[50vh] md:h-auto md:min-h-[calc(100vh-4rem)] sm:md:min-h-[calc(100vh-5rem)] border-b md:border-b-0 bg-white"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
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
          <div className="pointer-events-none absolute left-4 top-4 text-xs font-mono text-gray-500 uppercase tracking-wider">
            Memory Mesh
          </div>

          {/* Legend Overlay (top-right) */}
          <div className="absolute right-4 top-4 z-20 max-w-[240px]">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">Legend</span>
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
                  className="text-xs font-medium text-gray-700 hover:text-black px-2 py-1 border border-gray-300 hover:border-black hover:bg-black hover:text-white transition-all rounded-none"
                >
                  Browse
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Statistics</div>
                  <div className="flex items-center justify-between text-xs text-gray-900">
                    <span>Nodes</span>
                    <span className="font-mono font-semibold">{totalMemoryCount || memories.length}</span>
                  </div>
                  {searchResults && searchResults.results && (
                    <div className="flex items-center justify-between text-xs text-gray-900">
                      <span>Connections</span>
                      <span className="font-mono font-semibold">{searchResults.results.length}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Node Types</div>
                  <div className="space-y-1.5">
                    <span className="flex items-center gap-2 text-xs text-gray-700"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" /> Browser/Extension</span>
                    <span className="flex items-center gap-2 text-xs text-gray-700"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" /> Manual/Docs</span>
                    <span className="flex items-center gap-2 text-xs text-gray-700"><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" /> Other</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Connections</div>
                  <div className="space-y-1.5">
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-4 h-[1.5px] bg-blue-500" />
                      Strong (&gt;85%)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-4 h-[1px] bg-sky-400" />
                      Medium (&gt;75%)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-4 h-[0.5px] bg-gray-400" />
                      Weak (&lt;75%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Dialog */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsDialogOpen(false)}>
            <div className="bg-white border border-gray-200 shadow-xl w-[1200px] h-[800px] max-w-[95vw] max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-medium text-gray-900">Memory Details</h2>
                <button
                  onClick={() => { setIsDialogOpen(false); setSelectedMemory(null); setClickedNodeId(null) }}
                  className="text-gray-400 hover:text-gray-900 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden bg-white">
                {/* Left: Searchable List */}
                <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
                  <div className="p-4 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search memories..."
                      value={listSearchQuery}
                      onChange={(e) => setListSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black rounded-none"
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
                            selectedMemory?.id === result.memory.id ? 'bg-black text-white border-l-2 border-l-black' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className={`text-xs font-medium truncate ${selectedMemory?.id === result.memory.id ? 'text-white' : 'text-gray-900'}`}>
                              {result.memory.title || 'Untitled Memory'}
                            </div>
                            {result.blended_score !== undefined && (
                              <span className={`text-[10px] font-mono ml-2 flex-shrink-0 ${selectedMemory?.id === result.memory.id ? 'text-gray-200' : 'text-gray-500'}`}>
                                {(result.blended_score * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <div className={`text-[10px] font-mono ${selectedMemory?.id === result.memory.id ? 'text-gray-300' : 'text-gray-500'}`}>
                            {result.memory.created_at ? new Date(result.memory.created_at).toLocaleDateString() : 'NO DATE'} • {result.memory.source || 'UNKNOWN'}
                          </div>
                          {result.memory.summary && (
                            <div className={`text-[10px] mt-1 line-clamp-2 ${selectedMemory?.id === result.memory.id ? 'text-gray-300' : 'text-gray-600'}`}>
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
                      memories.length > 0 ? (
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
                              selectedMemory?.id === memory.id ? 'bg-black text-white border-l-2 border-l-black' : ''
                            }`}
                          >
                            <div className={`text-xs font-medium truncate mb-1 ${selectedMemory?.id === memory.id ? 'text-white' : 'text-gray-900'}`}>
                              {memory.title || 'Untitled Memory'}
                            </div>
                            <div className={`text-[10px] font-mono ${selectedMemory?.id === memory.id ? 'text-gray-300' : 'text-gray-500'}`}>
                              {memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'NO DATE'} • {memory.source || 'UNKNOWN'}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No memories available
                        </div>
                      )
                    ) : null}
                  </div>
                </div>

                {/* Right: Details */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                  {listSearchQuery.trim() && dialogSearchResults && (
                    <div className="space-y-4 mb-6">
                      {dialogSearchAnswer && (
                        <div className="bg-gray-50 border border-gray-200 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">Answer</div>
                          <p className="text-sm text-gray-900 leading-relaxed break-words whitespace-pre-wrap">
                            {dialogSearchAnswer}
                          </p>
                        </div>
                      )}
                      {dialogSearchMeta && (
                        <div className="bg-gray-50 border border-gray-200 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">Meta Summary</div>
                          <p className="text-sm text-gray-900 leading-relaxed break-words">
                            {dialogSearchMeta}
                          </p>
                        </div>
                      )}
                      {dialogSearchCitations && dialogSearchCitations.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">Citations</div>
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
                                        className="text-blue-600 hover:text-black hover:underline truncate"
                                      >
                                        {title}
                                      </a>
                                    ) : (
                                      <button
                                        title={title}
                                        onClick={() => selectMemoryById(citation.memory_id)}
                                        className="text-blue-600 hover:text-black hover:underline truncate text-left"
                                      >
                                        {title}
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => selectMemoryById(citation.memory_id)}
                                    className="text-gray-600 hover:text-black whitespace-nowrap"
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
                    <div className="space-y-5">
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
                          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Summary</div>
                          <p className="text-sm text-gray-800 leading-relaxed break-words">
                            {selectedMemory.summary}
                          </p>
                        </div>
                      ) : selectedMemory.content ? (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Content</div>
                          <p className={`text-sm text-gray-800 leading-relaxed break-words ${expandedContent ? '' : 'line-clamp-10'}`}>
                            {selectedMemory.content}
                          </p>
                          {selectedMemory.content && selectedMemory.content.length > 500 && (
                            <button
                              onClick={() => setExpandedContent(!expandedContent)}
                              className="mt-2 text-xs font-medium text-gray-700 hover:text-black px-2 py-1 border border-gray-300 hover:border-black hover:bg-black hover:text-white transition-all rounded-none"
                            >
                              {expandedContent ? 'Collapse' : 'Expand'}
                            </button>
                          )}
                        </div>
                      ) : null}

                      {selectedMemory.url && selectedMemory.url !== 'unknown' && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Source</div>
                          <a
                            href={selectedMemory.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-black break-all hover:underline"
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

        <PendingJobsPanel 
          userId={userId}
          isOpen={isPendingJobsOpen}
          onClose={() => setIsPendingJobsOpen(false)}
        />
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