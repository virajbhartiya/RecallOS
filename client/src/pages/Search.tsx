import React, { useState, useCallback, useEffect } from 'react'
import { MemorySearch } from '../components/MemorySearch'
import { MemoryService } from '../services/memoryService'
import { MemorySearchResultCard } from '../components/MemorySearchResultCard'
import { LoadingCard, ErrorMessage, EmptyState } from '../components/ui/loading-spinner'
import type { Memory, SearchFilters, MemorySearchResponse } from '../types/memory'
import { requireAuthToken } from '@/utils/userId'
import { useNavigate } from 'react-router-dom'
import { getProfileContext } from '../services/profile'

export const Search: React.FC = () => {
  const navigate = useNavigate()
  const [searchResults, setSearchResults] = useState<MemorySearchResponse | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showOnlyCited, setShowOnlyCited] = useState(true)
  const [profileContext, setProfileContext] = useState<string>('')

  useEffect(() => {
    try {
      requireAuthToken()
      setIsAuthenticated(true)
    } catch (error) {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchProfileContext = async () => {
      try {
        const context = await getProfileContext()
        setProfileContext(context)
      } catch (error) {
        console.error('Error fetching profile context:', error)
      }
    }

    fetchProfileContext()
  }, [isAuthenticated])

  const handleSearch = useCallback(async (
    query: string, 
    filters: SearchFilters
  ) => {
    setIsLoading(true)
    setError(null)
    setSearchResults(null)

    try {
      // Require authentication
      requireAuthToken()

      const response = await MemoryService.searchMemories(
        query,
        filters,
        1,
        20
      )

      setSearchResults(response)
    } catch (err) {
      setError('Failed to search memories')
      console.error('Error searching memories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchResults(null)
    setError(null)
  }, [])

  const handleSelectMemory = useCallback((memory: Memory) => {
    setSelectedMemory(memory)
    setIsPopupOpen(true)
  }, [])

  const handleClosePopup = useCallback(() => {
    setIsPopupOpen(false)
    setSelectedMemory(null)
  }, [])

  // Filter results to show only cited memories
  const getFilteredResults = () => {
    if (!searchResults) return []
    
    if (!showOnlyCited || !searchResults.citations) {
      return searchResults.results
    }
    
    // Get memory IDs from citations
    const citedMemoryIds = searchResults.citations.map(citation => citation.memory_id)
    
    // Filter results to only include cited memories
    return searchResults.results.filter(result => 
      citedMemoryIds.includes(result.memory.id)
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
            [MEMORY SEARCH]
          </h1>
          <p className="text-gray-600 font-mono">
            Search through your memories using keyword or semantic search
          </p>
        </div>

        {/* Search Interface */}
        <div className="mb-8">
          {/* Profile Context */}
          {profileContext && (
            <div className="bg-blue-50 border border-blue-200 p-4 mb-4">
              <div className="text-xs font-mono text-blue-600 mb-2 uppercase tracking-wide">
                [PROFILE CONTEXT - USED IN SEARCH]
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {profileContext}
              </div>
            </div>
          )}

          <MemorySearch
            onSearch={handleSearch}
            onClearFilters={handleClearFilters}
            isLoading={isLoading}
            resultCount={searchResults?.total}
            className="mb-6"
            profileContext={profileContext}
          />
          
          {/* Show Only Cited Memories Toggle */}
          {searchResults && searchResults.citations && searchResults.citations.length > 0 && (
            <div className="bg-white border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-mono text-gray-600">
                  [DISPLAY OPTIONS]
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyCited}
                    onChange={(e) => setShowOnlyCited(e.target.checked)}
                    className="border-gray-300"
                  />
                  <span className="text-sm font-mono text-gray-700">
                    Show only cited memories ({searchResults.citations.length} cited)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="space-y-6">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingCard key={i} />
              ))}
            </div>
          )}

          {error && (
            <ErrorMessage 
              message={error}
              onRetry={() => setError(null)}
            />
          )}

          {searchResults && searchResults.results.length === 0 && (
            <EmptyState
              title="No memories found"
              description="Try adjusting your search query or filters"
              action={{
                label: "Clear Filters",
                onClick: handleClearFilters
              }}
            />
          )}

          {searchResults && searchResults.results.length > 0 && (
            <>
              {/* AI-Generated Summary */}
              {searchResults.answer && (
                <div className="bg-yellow-50 border border-yellow-200 p-4">
                  <div className="text-sm font-mono text-gray-600 mb-2">
                    [AI SUMMARY]
                  </div>
                  <div className="text-sm text-gray-800 mb-3">
                    {searchResults.answer}
                  </div>
                  {searchResults.citations && searchResults.citations.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <span className="font-mono">Citations:</span>{' '}
                      {searchResults.citations.map((citation, index) => (
                        <span key={citation.memory_id}>
                          <a 
                            href={citation.url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            [{citation.label}] {citation.title}
                          </a>
                          {index < searchResults.citations!.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search Stats */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 mb-2">
                  [SEARCH RESULTS]
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-mono text-gray-700">
                    {showOnlyCited ? (
                      <>
                        Showing {getFilteredResults().length} cited memories
                        {getFilteredResults().length !== searchResults.total && ` (of ${searchResults.total} total results)`}
                      </>
                    ) : (
                      <>
                        Showing all {searchResults.total} {searchResults.total === 1 ? 'result' : 'results'}
                        {searchResults.page > 1 && ` (page ${searchResults.page})`}
                      </>
                    )}
                  </div>
                  {searchResults.filters && Object.keys(searchResults.filters).length > 0 && (
                    <div className="text-xs font-mono text-gray-500">
                      Filters applied: {Object.keys(searchResults.filters).length}
                    </div>
                  )}
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredResults().map((result) => (
                  <MemorySearchResultCard
                    key={result.memory.id}
                    result={result}
                    onClick={handleSelectMemory}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Memory Detail Popup */}
      {isPopupOpen && selectedMemory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-mono font-bold text-gray-900">
                  [MEMORY DETAILS]
                </h2>
                <button
                  onClick={handleClosePopup}
                  className="text-gray-500 hover:text-gray-700 font-mono text-sm"
                >
                  [CLOSE]
                </button>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <h3 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">
                    [TITLE]
                  </h3>
                  <p className="text-lg font-mono text-gray-900">
                    {selectedMemory.title || 'Untitled Memory'}
                  </p>
                </div>

                {/* Summary */}
                {selectedMemory.summary && (
                  <div>
                    <h3 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">
                      [SUMMARY]
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedMemory.summary}
                    </p>
                  </div>
                )}

                {/* Content */}
                {selectedMemory.content && (
                  <div>
                    <h3 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">
                      [CONTENT]
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 p-4 max-h-64 overflow-y-auto">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {selectedMemory.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">
                      [METADATA]
                    </h3>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source:</span>
                        <span className="text-gray-900 uppercase">{selectedMemory.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-gray-900">
                          {new Date(selectedMemory.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedMemory.url && selectedMemory.url !== 'unknown' && (
                    <div>
                      <h3 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">
                        [URL]
                      </h3>
                      <a
                        href={selectedMemory.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-blue-600 hover:text-black break-all"
                      >
                        {selectedMemory.url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
