import React, { useState } from "react"

import type { SearchFilters } from "../types/memory"
import { LoadingSpinner } from "./ui/loading-spinner"

interface MemorySearchProps {
  onSearch: (query: string, filters: SearchFilters) => void
  onClearFilters: () => void
  isLoading?: boolean
  resultCount?: number
  className?: string
  compact?: boolean
  profileContext?: string
}

export const MemorySearch: React.FC<MemorySearchProps> = ({
  onSearch,
  onClearFilters,
  isLoading = false,
  resultCount,
  className = "",
  compact = false,
  profileContext = "",
}) => {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<SearchFilters>({})

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim(), filters)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleFilterChange = (
    key: keyof SearchFilters,
    value:
      | string
      | number
      | { min: number; max: number }
      | { start?: string; end?: string }
      | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setQuery("")
    onClearFilters()
  }

  const hasActiveFilters =
    Object.keys(filters).length > 0 || query.trim() !== ""

  return (
    <div
      className={`bg-white border border-gray-200 ${compact ? "p-3" : "p-4"} ${className}`}
    >
      <div
        className={`font-mono text-gray-600 ${compact ? "text-xs mb-2" : "text-xs mb-3"} uppercase tracking-wide`}
      >
        [SEARCH & FILTER]
      </div>

      {/* Profile Context Hint */}
      {profileContext && (
        <div className="mb-3 p-2 bg-gray-50 border border-gray-200">
          <div className="text-xs font-mono text-gray-500 mb-1 uppercase tracking-wide">
            [PROFILE CONTEXT INJECTED]
          </div>
          <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">
            {profileContext.substring(0, 150)}...
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className={compact ? "mb-2" : "mb-3"}>
        <div className="flex flex-col space-y-2 mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              profileContext
                ? "Search memories (profile context will be used)..."
                : "Search memories..."
            }
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
            disabled={isLoading}
            title={
              profileContext
                ? `Profile context: ${profileContext.substring(0, 200)}...`
                : undefined
            }
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="w-full px-2 py-1 text-xs font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>SEARCHING</span>
              </>
            ) : (
              <span>SEARCH</span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        {/* Category Filter */}
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            CATEGORY
          </label>
          <select
            value={filters.category || ""}
            onChange={(e) =>
              handleFilterChange("category", e.target.value || undefined)
            }
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          >
            <option value="">All Categories</option>
            <option value="web">Web</option>
            <option value="document">Document</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="social">Social</option>
            <option value="news">News</option>
          </select>
        </div>

        {/* Sentiment Filter */}
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            SENTIMENT
          </label>
          <select
            value={filters.sentiment || ""}
            onChange={(e) =>
              handleFilterChange("sentiment", e.target.value || undefined)
            }
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        {/* Transaction Status Filter */}

        {/* Source Filter */}
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            SOURCE
          </label>
          <select
            value={filters.source || ""}
            onChange={(e) =>
              handleFilterChange("source", e.target.value || undefined)
            }
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          >
            <option value="">All Sources</option>
            <option value="browser">Browser</option>
            <option value="extension">Extension</option>
            <option value="manual">Manual</option>
            <option value="reasoning">Reasoning</option>
          </select>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className={`grid grid-cols-1 gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            START DATE
          </label>
          <input
            type="date"
            value={filters.dateRange?.start || ""}
            onChange={(e) =>
              handleFilterChange("dateRange", {
                ...filters.dateRange,
                start: e.target.value,
              })
            }
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            END DATE
          </label>
          <input
            type="date"
            value={filters.dateRange?.end || ""}
            onChange={(e) =>
              handleFilterChange("dateRange", {
                ...filters.dateRange,
                end: e.target.value,
              })
            }
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Results Count and Clear Filters */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-mono text-gray-600">
          {resultCount !== undefined && (
            <span>
              {resultCount} {resultCount === 1 ? "RESULT" : "RESULTS"}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-xs font-mono uppercase tracking-wide border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-500 transition-all duration-200"
          >
            CLEAR FILTERS
          </button>
        )}
      </div>
    </div>
  )
}
