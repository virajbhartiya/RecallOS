import React, { useState, useCallback, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { MemoryService } from '../services/memoryService'
import { MemoryMesh } from '../components/MemoryMesh'
import { MemorySearch } from '../components/MemorySearch'
import type { Memory, MemoryInsights, SearchFilters, MemorySearchResponse } from '../types/memory'

// Memory Popup Component
const MemoryPopup: React.FC<{
  isOpen: boolean
  onClose: () => void
  memories: Memory[]
  selectedMemory: Memory | null
  onSelectMemory: (memory: Memory) => void
  isLoading: boolean
  error: string | null
  onRetry: () => void
  expandedContent: boolean
  setExpandedContent: (expanded: boolean) => void
  // Search props
  searchResults?: MemorySearchResponse | null
  isSearchMode?: boolean
  onSearch?: (query: string, filters: SearchFilters, useSemantic: boolean) => void
  onClearSearch?: () => void
  isSearching?: boolean
  searchError?: string | null
}> = ({ 
  isOpen, 
  onClose, 
  memories, 
  selectedMemory, 
  onSelectMemory, 
  isLoading, 
  error, 
  onRetry, 
  expandedContent, 
  setExpandedContent,
  searchResults,
  isSearchMode,
  onSearch,
  onClearSearch,
  isSearching,
  searchError
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed top-16 right-4 w-[700px] max-h-[calc(100vh-5rem)] bg-white/98 backdrop-blur-sm border border-gray-200/60 shadow-2xl rounded-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-white/80 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <h2 className="text-base font-semibold text-gray-800">
            Memory Explorer
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Section */}
      {onSearch && (
        <div className="border-b border-gray-200/60 bg-gray-50/50 flex-shrink-0">
          <div className="p-4">
            <MemorySearch
              onSearch={onSearch}
              onClearFilters={onClearSearch || (() => {})}
              isLoading={isSearching}
              resultCount={searchResults?.total}
              className="text-xs"
              compact={true}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Memory List - Left Panel */}
        <div className="w-1/2 border-r border-gray-200/60 bg-gray-50/30 flex flex-col">
          {/* List Header */}
          <div className="px-4 py-3 border-b border-gray-200/60 bg-white/50 flex-shrink-0">
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              {isSearchMode ? 'Search Results' : 'Memories'}
            </h3>
            <p className="text-xs text-gray-500">
              {isSearchMode ? 
                (searchResults ? `${searchResults.total} results` : 'No search performed') :
                `${memories.length} total`
              }
            </p>
          </div>

          {/* Memory List Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
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
                  onClick={onRetry}
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
                  onClick={() => onClearSearch?.()}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200"
                >
                  Clear Search
                </button>
              </div>
            ) : isSearchMode && searchResults ? (
              <div className="space-y-3">
                {searchResults.results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No memories found matching your search</p>
                  </div>
                ) : (
                  searchResults.results.map((result) => (
                    <button
                      key={result.memory.id}
                      onClick={() => onSelectMemory(result.memory)}
                      className={`w-full text-left p-4 rounded-lg transition-all duration-200 group border ${
                        selectedMemory?.id === result.memory.id
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'hover:bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors mb-1">
                            {result.memory.title || 'Untitled Memory'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {result.memory.created_at ? new Date(result.memory.created_at).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {result.search_type && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              result.search_type === 'keyword' ? 'bg-blue-100 text-blue-700' :
                              result.search_type === 'semantic' ? 'bg-purple-100 text-purple-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {result.search_type}
                            </span>
                          )}
                          {result.blended_score !== undefined && (
                            <span className="text-xs text-gray-500 font-mono">
                              {(result.blended_score * 100).toFixed(0)}%
                            </span>
                          )}
                          {result.memory.tx_status && (
                            <div className={`w-2 h-2 rounded-full ${
                              result.memory.tx_status === 'confirmed' ? 'bg-green-500' :
                              result.memory.tx_status === 'pending' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}></div>
                          )}
                        </div>
                      </div>
                      {result.memory.summary && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                          {result.memory.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="uppercase font-mono">{result.memory.source}</span>
                        {result.memory.url && result.memory.url !== 'unknown' && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{result.memory.url}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No memories found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memories.map((memory) => (
                  <button
                    key={memory.id}
                    onClick={() => onSelectMemory(memory)}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 group border ${
                      selectedMemory?.id === memory.id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'hover:bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors mb-1">
                          {memory.title || 'Untitled Memory'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        {memory.tx_status && (
                          <div className={`w-2 h-2 rounded-full ${
                            memory.tx_status === 'confirmed' ? 'bg-green-500' :
                            memory.tx_status === 'pending' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></div>
                        )}
                        {memory.importance_score && (
                          <div className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            {Math.round(memory.importance_score * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                    {(memory.summary || memory.content) && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {memory.summary || (memory.content && memory.content.slice(0, 100) + (memory.content.length > 100 ? '...' : ''))}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>h=

        {/* Memory Details - Right Panel */}
        <div className="w-1/2 bg-white flex flex-col">
          {selectedMemory ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-lg font-light text-gray-900 mb-2 leading-tight">
                    {selectedMemory.title || 'Untitled Memory'}
                  </h3>
                  <div className="flex items-center gap-3 text-sm font-mono text-gray-500">
                    <span>{selectedMemory.created_at ? new Date(selectedMemory.created_at).toLocaleDateString() : 'NO DATE'}</span>
                    {selectedMemory.source && (
                      <>
                        <span>•</span>
                        <span className="font-mono uppercase text-xs bg-gray-100 px-2 py-1 border border-gray-200">
                          [{selectedMemory.source}]
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status & Importance */}
                <div className="flex items-center gap-4 mb-6">
                  {selectedMemory.tx_status && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-600">[STATUS]</span>
                      <span className={`px-3 py-1 text-sm font-mono uppercase tracking-wide border ${
                        selectedMemory.tx_status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                        selectedMemory.tx_status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {selectedMemory.tx_status}
                      </span>
                    </div>
                  )}
                  {selectedMemory.importance_score && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-600">[IMPORTANCE]</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 h-2 border border-gray-300">
                          <div 
                            className="bg-blue-500 h-2 transition-all duration-300" 
                            style={{ width: `${selectedMemory.importance_score * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-mono text-gray-600">
                          {Math.round(selectedMemory.importance_score * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                {selectedMemory.summary && (
                  <div className="mb-6">
                    <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[SUMMARY]</h4>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedMemory.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Full Content */}
                {selectedMemory.content && (
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
                        {selectedMemory.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* URL */}
                {selectedMemory.url && selectedMemory.url !== 'unknown' && (
                  <div className="mb-6">
                    <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[SOURCE URL]</h4>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <a 
                        href={selectedMemory.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 break-all"
                      >
                        {selectedMemory.url}
                      </a>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedMemory.page_metadata && (
                  <div className="mb-6">
                    <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[METADATA]</h4>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedMemory.page_metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}

export const Memories: React.FC = () => {
  const { isConnected, address } = useWallet()
  const [memories, setMemories] = useState<Memory[]>([])
  const [insights, setInsights] = useState<MemoryInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [expandedContent, setExpandedContent] = useState(false)
  
  // Search state
  const [searchResults, setSearchResults] = useState<MemorySearchResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)

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

  const handleSelectMemory = (memory: Memory) => {
    setSelectedMemory(memory)
    setExpandedContent(false) // Reset expanded state when selecting new memory
  }

  const handleNodeClick = (memoryId: string) => {
    // Find the memory by ID in either memories or search results
    const memory = memories.find(m => m.id === memoryId) || 
                   searchResults?.results.find(r => r.memory.id === memoryId)?.memory
    if (memory) {
      setSelectedMemory(memory)
      setExpandedContent(false)
      setIsPopupOpen(true) // Open the sidebar
    }
  }

  const handleSearch = useCallback(async (
    query: string, 
    filters: SearchFilters, 
    useSemantic: boolean
  ) => {
    if (!address) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResults(null)
    setIsSearchMode(true)

    try {
      let response: MemorySearchResponse

      if (useSemantic) {
        response = await MemoryService.searchMemoriesWithEmbeddings(
          address,
          query,
          filters,
          1,
          20
        )
      } else {
        response = await MemoryService.searchMemories(
          address,
          query,
          filters,
          1,
          20
        )
      }

      setSearchResults(response)
    } catch (err) {
      setSearchError('Failed to search memories')
      console.error('Error searching memories:', err)
    } finally {
      setIsSearching(false)
    }
  }, [address])

  const handleClearSearch = useCallback(() => {
    setSearchResults(null)
    setSearchError(null)
    setIsSearchMode(false)
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      fetchMemories()
    }
  }, [isConnected, address, fetchMemories])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-light text-gray-900 mb-2">[WALLET NOT CONNECTED]</h2>
          <p className="text-sm font-mono text-gray-500 mb-4">Connect your wallet to view your memories</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
          >
            [CONNECT WALLET]
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
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
              <button
                onClick={() => setIsPopupOpen(!isPopupOpen)}
                className="text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
              >
                {isPopupOpen ? '[HIDE EXPLORER]' : '[SHOW EXPLORER]'}
              </button>
              {address && (
                <div className="flex items-center space-x-2 text-xs font-mono text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="h-[calc(100vh-73px)]">
        <MemoryMesh 
          userAddress={address || undefined}
          className="w-full h-full"
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Memory Popup */}
      <MemoryPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        memories={memories}
        selectedMemory={selectedMemory}
        onSelectMemory={handleSelectMemory}
        isLoading={isLoading}
        error={error}
        onRetry={fetchMemories}
        expandedContent={expandedContent}
        setExpandedContent={setExpandedContent}
        searchResults={searchResults}
        isSearchMode={isSearchMode}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        isSearching={isSearching}
        searchError={searchError}
      />

      {/* Memory Stats Overlay */}
      {insights && (
        <div className="fixed bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl p-4 z-40">
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
      )}
    </div>
  )
}