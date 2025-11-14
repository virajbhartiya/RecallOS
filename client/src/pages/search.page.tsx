import React, { useCallback, useEffect, useState } from "react"
import { requireAuthToken } from "@/utils/user-id.util"
import { useNavigate } from "react-router-dom"

import { MemorySearch } from "../components/MemorySearch"
import { MemorySearchResultCard } from "../components/MemorySearchResultCard"
import {
  EmptyState,
  ErrorMessage,
  LoadingCard,
} from "../components/ui/loading-spinner"
import { MemoryService } from "../services/memory.service"
import { getProfileContext } from "../services/profile.service"
import type {
  Memory,
  MemorySearchResponse,
  SearchFilters,
} from "../types/memory.type"

const buildExportText = (searchResults: MemorySearchResponse): string => {
  const parts: string[] = []
  
  if (searchResults.answer) {
    parts.push("=== AI ANSWER ===")
    parts.push(searchResults.answer)
    parts.push("")
  }
  
  if (searchResults.citations && searchResults.citations.length > 0) {
    parts.push("=== CITATIONS ===")
    searchResults.citations.forEach((citation) => {
      parts.push(`[${citation.label}] ${citation.title || "Untitled"}`)
      if (citation.url) {
        parts.push(`  URL: ${citation.url}`)
      }
    })
    parts.push("")
  }
  
  if (searchResults.results && searchResults.results.length > 0) {
    parts.push("=== MEMORIES ===")
    searchResults.results.slice(0, 10).forEach((result, idx) => {
      parts.push(`${idx + 1}. ${result.memory.title || "Untitled"}`)
      if (result.memory.summary) {
        parts.push(`   ${result.memory.summary}`)
      }
      if (result.memory.url) {
        parts.push(`   URL: ${result.memory.url}`)
      }
    })
  }
  
  return parts.join("\n")
}

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    // Show a brief toast notification
    const toast = document.createElement("div")
    toast.className = "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 font-mono text-sm"
    toast.textContent = "✓ Copied to clipboard!"
    document.body.appendChild(toast)
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 2000)
  } catch (err) {
    console.error("Failed to copy to clipboard:", err)
    alert("Failed to copy to clipboard. Please copy manually.")
  }
}

export const Search: React.FC = () => {
  const navigate = useNavigate()
  const [searchResults, setSearchResults] =
    useState<MemorySearchResponse | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showOnlyCited, setShowOnlyCited] = useState(true)
  const [profileContext, setProfileContext] = useState<string>("")

  useEffect(() => {
    try {
      requireAuthToken()
      setIsAuthenticated(true)
    } catch (error) {
      navigate("/login")
    }
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchProfileContext = async () => {
      try {
        const context = await getProfileContext()
        setProfileContext(context)
      } catch (error) {
        console.error("Error fetching profile context:", error)
      }
    }

    fetchProfileContext()
  }, [isAuthenticated])

  const handleSearch = useCallback(
    async (query: string, filters: SearchFilters) => {
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
        setError("Failed to search memories")
        console.error("Error searching memories:", err)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPopupOpen) return

      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      if (e.key === "Escape" && !isInput) {
        e.preventDefault()
        e.stopPropagation()
        handleClosePopup()
      }
    }

    if (isPopupOpen) {
      document.addEventListener("keydown", handleKeyDown, true)
      return () => {
        document.removeEventListener("keydown", handleKeyDown, true)
      }
    }
  }, [isPopupOpen, handleClosePopup])

  // Filter results to show only cited memories
  const getFilteredResults = () => {
    if (!searchResults) return []

    if (!showOnlyCited || !searchResults.citations) {
      return searchResults.results
    }

    // Get memory IDs from citations
    const citedMemoryIds = searchResults.citations.map(
      (citation) => citation.memory_id
    )

    // Filter results to only include cited memories
    return searchResults.results.filter((result) =>
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
          {searchResults &&
            searchResults.citations &&
            searchResults.citations.length > 0 && (
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
                      Show only cited memories ({searchResults.citations.length}{" "}
                      cited)
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
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          )}

          {searchResults && searchResults.results.length === 0 && (
            <EmptyState
              title="No memories found"
              description="Try adjusting your search query or filters"
              action={{
                label: "Clear Filters",
                onClick: handleClearFilters,
              }}
            />
          )}

          {searchResults && searchResults.results.length > 0 && (
            <>
              {/* AI-Generated Summary */}
              {searchResults.answer && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 p-6 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-mono text-gray-700 font-semibold uppercase tracking-wide">
                      [AI ANSWER SUMMARY]
                    </div>
                    <button
                      onClick={() => {
                        const exportText = buildExportText(searchResults)
                        copyToClipboard(exportText)
                      }}
                      className="px-3 py-1.5 text-xs font-mono uppercase tracking-wide border border-gray-400 bg-white hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                      title="Export to ChatGPT/Claude"
                    >
                      <span>📋</span>
                      <span>EXPORT</span>
                    </button>
                  </div>
                  <div className="text-base text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">
                    {searchResults.answer}
                  </div>
                  {searchResults.citations &&
                    searchResults.citations.length > 0 && (
                      <div className="border-t border-yellow-300 pt-4">
                        <div className="text-xs font-mono text-gray-600 mb-2 uppercase tracking-wide">
                          [CITATIONS - {searchResults.citations.length}]
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {searchResults.citations.map((citation) => (
                            <a
                              key={citation.memory_id}
                              href={citation.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-700 hover:text-blue-900 hover:underline flex items-start gap-2 p-2 bg-white rounded border border-yellow-200 hover:border-blue-300 transition-colors"
                            >
                              <span className="font-mono font-semibold text-gray-600 flex-shrink-0">
                                [{citation.label}]
                              </span>
                              <span className="flex-1">{citation.title || "Untitled"}</span>
                            </a>
                          ))}
                        </div>
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
                        {getFilteredResults().length !== searchResults.total &&
                          ` (of ${searchResults.total} total results)`}
                      </>
                    ) : (
                      <>
                        Showing all {searchResults.total}{" "}
                        {searchResults.total === 1 ? "result" : "results"}
                        {searchResults.page > 1 &&
                          ` (page ${searchResults.page})`}
                      </>
                    )}
                  </div>
                  {searchResults.filters &&
                    Object.keys(searchResults.filters).length > 0 && (
                      <div className="text-xs font-mono text-gray-500">
                        Filters applied:{" "}
                        {Object.keys(searchResults.filters).length}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClosePopup}
        >
          <div
            className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                    {selectedMemory.title || "Untitled Memory"}
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
                        <span className="text-gray-900 uppercase">
                          {selectedMemory.source}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-gray-900">
                          {new Date(selectedMemory.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedMemory.url && selectedMemory.url !== "unknown" && (
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
