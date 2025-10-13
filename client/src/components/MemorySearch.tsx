import React, { useState } from 'react'
import type { SearchFilters } from '../types/memory'
import { LoadingSpinner } from './ui/loading-spinner'

interface MemorySearchProps {
  onSearch: (query: string, filters: SearchFilters, useSemantic: boolean) => void
  onClearFilters: () => void
  isLoading?: boolean
  resultCount?: number
  className?: string
  compact?: boolean
}

export const MemorySearch: React.FC<MemorySearchProps> = ({
  onSearch,
  onClearFilters,
  isLoading = false,
  resultCount,
  className = '',
  compact = false
}) => {
  const [query, setQuery] = useState('')
  const [useSemantic, setUseSemantic] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim(), filters, useSemantic)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleFilterChange = (key: keyof SearchFilters, value: string | number | { min: number; max: number } | { start?: string; end?: string } | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setQuery('')
    onClearFilters()
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || query.trim() !== ''

  return (
    <div className={`bg-white border border-gray-200 ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <div className={`font-mono text-gray-600 ${compact ? 'text-xs mb-2' : 'text-xs mb-3'} uppercase tracking-wide`}>
        [SEARCH & FILTER]
      </div>

      {/* Search Input */}
      <div className={compact ? 'mb-2' : 'mb-3'}>
        <div className="flex flex-col space-y-2 mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search memories..."
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
            disabled={isLoading}
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

        {/* Search Type Toggle */}
        <div className="flex flex-col space-y-2 text-xs font-mono text-gray-600">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={!useSemantic}
              onChange={() => setUseSemantic(false)}
              className="border-gray-300"
            />
            <span>KEYWORD SEARCH</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={useSemantic}
              onChange={() => setUseSemantic(true)}
              className="border-gray-300"
            />
            <span>SEMANTIC SEARCH</span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        {/* Category Filter */}
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            CATEGORY
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
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
            value={filters.sentiment || ''}
            onChange={(e) => handleFilterChange('sentiment', e.target.value || undefined)}
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        {/* Transaction Status Filter */}
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            TX STATUS
          </label>
          <select
            value={filters.tx_status || ''}
            onChange={(e) => handleFilterChange('tx_status', e.target.value || undefined)}
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            SOURCE
          </label>
          <select
            value={filters.source || ''}
            onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          >
            <option value="">All Sources</option>
            <option value="browser">Browser</option>
            <option value="manual">Manual</option>
            <option value="on_chain">On-Chain</option>
            <option value="reasoning">Reasoning</option>
          </select>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className={`grid grid-cols-1 gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            START DATE
          </label>
          <input
            type="date"
            value={filters.dateRange?.start || ''}
            onChange={(e) => handleFilterChange('dateRange', {
              ...filters.dateRange,
              start: e.target.value
            })}
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-1">
            END DATE
          </label>
          <input
            type="date"
            value={filters.dateRange?.end || ''}
            onChange={(e) => handleFilterChange('dateRange', {
              ...filters.dateRange,
              end: e.target.value
            })}
            className="w-full px-2 py-1 border border-gray-300 bg-white text-xs font-mono focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Results Count and Clear Filters */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-mono text-gray-600">
          {resultCount !== undefined && (
            <span>
              {resultCount} {resultCount === 1 ? 'RESULT' : 'RESULTS'}
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
