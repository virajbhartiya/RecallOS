import React, { memo, useCallback, useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"

import type { Memory, MemorySearchResponse } from "../types/memory.type"

interface SpotlightSearchProps {
  isOpen: boolean
  searchQuery: string
  searchResults: MemorySearchResponse | null
  isSearching: boolean
  searchAnswer: string | null
  searchCitations: Array<{
    label: number
    memory_id: string
    title: string | null
    url: string | null
  }> | null
  isEmbeddingOnly: boolean
  onEmbeddingOnlyChange: (value: boolean) => void
  onSearchQueryChange: (query: string) => void
  onSelectMemory: (memory: Memory) => void
  onClose: () => void
}

const SpotlightSearchComponent: React.FC<SpotlightSearchProps> = ({
  isOpen,
  searchQuery,
  searchResults,
  isSearching,
  searchAnswer,
  searchCitations,
  isEmbeddingOnly,
  onEmbeddingOnlyChange,
  onSearchQueryChange,
  onSelectMemory,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setSelectedIndex(-1)
    }
  }, [isOpen])

  // Reset selected index when switching modes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [isEmbeddingOnly])

  // Handle global Escape key when spotlight is open
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener("keydown", handleGlobalEscape, true)
    return () => {
      document.removeEventListener("keydown", handleGlobalEscape, true)
    }
  }, [isOpen, onClose])

  // Handle keyboard navigation (only in Embedding mode)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }

      // Only allow navigation in Embedding mode
      if (!isEmbeddingOnly) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const results = searchResults?.results || []
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        }
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        const results = searchResults?.results || []
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        }
        return
      }

      if (e.key === "Enter" && selectedIndex >= 0) {
        const results = searchResults?.results || []
        if (results[selectedIndex]) {
          const memory = results[selectedIndex].memory
          if (memory.url) {
            window.open(memory.url, "_blank", "noopener,noreferrer")
          } else {
            onSelectMemory(memory)
            onClose()
          }
        }
        return
      }
    },
    [searchResults, selectedIndex, onSelectMemory, onClose, isEmbeddingOnly]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(`search-result-${selectedIndex}`)
      if (element) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const results = searchResults?.results || []

  // Deduplicate citations and create label mapping
  const getDeduplicatedCitations = () => {
    if (!searchCitations || searchCitations.length === 0) {
      return { uniqueCitations: [], labelMap: new Map<number, number>() }
    }

    const urlToFirstLabel = new Map<string, number>()
    const memoryIdToFirstLabel = new Map<string, number>()
    const uniqueCitations: typeof searchCitations = []
    const labelMap = new Map<number, number>()

    searchCitations.forEach((citation) => {
      const url =
        citation.url && citation.url !== "unknown" ? citation.url : null
      const originalLabel = citation.label ?? 0

      if (url) {
        const firstLabel = urlToFirstLabel.get(url)
        if (firstLabel !== undefined) {
          // This URL was seen before, map to the first occurrence's label
          labelMap.set(originalLabel, firstLabel)
        } else {
          // First time seeing this URL
          const newLabel = uniqueCitations.length + 1
          urlToFirstLabel.set(url, newLabel)
          uniqueCitations.push({ ...citation, label: newLabel })
          labelMap.set(originalLabel, newLabel)
        }
      } else {
        const firstLabel = memoryIdToFirstLabel.get(citation.memory_id)
        if (firstLabel !== undefined) {
          // This memory_id was seen before, map to the first occurrence's label
          labelMap.set(originalLabel, firstLabel)
        } else {
          // First time seeing this memory_id
          const newLabel = uniqueCitations.length + 1
          memoryIdToFirstLabel.set(citation.memory_id, newLabel)
          uniqueCitations.push({ ...citation, label: newLabel })
          labelMap.set(originalLabel, newLabel)
        }
      }
    })

    return { uniqueCitations, labelMap }
  }

  const { uniqueCitations, labelMap } = getDeduplicatedCitations()

  // Process answer text to update citation numbers
  const processAnswerText = (text: string): string => {
    if (!text || labelMap.size === 0) return text

    // Match citation patterns like [2], [2, 3, 4], [2,3,4], etc.
    let processed = text.replace(
      /\[(\d+(?:\s*,\s*\d+)*)\]/g,
      (_match, numbers) => {
        const citationNumbers = numbers
          .split(",")
          .map((n: string) => parseInt(n.trim(), 10))
          .filter((n: number) => !isNaN(n))

        const mappedNumbers = citationNumbers
          .map((n: number) => labelMap.get(n))
          .filter((n: number | undefined): n is number => n !== undefined)
          .sort((a: number, b: number) => a - b)

        // Remove duplicates from mapped numbers
        const uniqueMappedNumbers = Array.from(new Set(mappedNumbers))

        if (uniqueMappedNumbers.length === 0) {
          return "" // Remove citation if all references were filtered out
        }

        return `[${uniqueMappedNumbers.join(", ")}]`
      }
    )

    // Second pass: Merge consecutive duplicate citations like [1] [1] [1] or [1], [1], [1] into [1]
    processed = processed.replace(
      /(\[\d+(?:,\s*\d+)*\])(?:\s*,\s*\1|\s+\1)+/g,
      "$1"
    )

    // Clean up multiple consecutive spaces (but preserve newlines)
    processed = processed
      .replace(/[ \t]+/g, " ")
      .replace(/^[ \t]+|[ \t]+$/gm, "")

    return processed
  }

  const processedAnswer = searchAnswer ? processAnswerText(searchAnswer) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-gray-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wide">
              Mode:
            </span>
            <div className="inline-flex border border-gray-200">
              <button
                type="button"
                onClick={() => onEmbeddingOnlyChange(true)}
                className={`px-3 py-1 text-[11px] font-mono uppercase ${
                  isEmbeddingOnly
                    ? "bg-black text-white"
                    : "bg-white text-gray-600"
                }`}
              >
                Embedding
              </button>
              <button
                type="button"
                onClick={() => onEmbeddingOnlyChange(false)}
                className={`px-3 py-1 text-[11px] font-mono uppercase border-l border-gray-200 ${
                  !isEmbeddingOnly
                    ? "bg-black text-white"
                    : "bg-white text-gray-600"
                }`}
              >
                Summarized
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!searchQuery.trim() && (
            <div className="p-8 text-center text-sm text-gray-400">
              Start typing to search your memories...
            </div>
          )}

          {isSearching && searchQuery.trim() && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                <span>Searching memories...</span>
              </div>
            </div>
          )}

          {/* Embedding Mode: Show results list */}
          {isEmbeddingOnly &&
            !isSearching &&
            searchQuery.trim() &&
            searchResults !== null &&
            results.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                No memories found for "{searchQuery}"
              </div>
            )}

          {isEmbeddingOnly &&
            !isSearching &&
            searchQuery.trim() &&
            searchResults !== null &&
            results.length > 0 && (
              <div className="divide-y divide-gray-100">
                {results.map((result, idx) => {
                  const memory = result.memory
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={memory.id}
                      id={`search-result-${idx}`}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        if (memory.url) {
                          window.open(
                            memory.url,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        } else {
                          onSelectMemory(memory)
                          onClose()
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {memory.title || "Untitled Memory"}
                            </h3>
                            {result.blended_score !== undefined && (
                              <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">
                                {(result.blended_score * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-gray-500">
                            {memory.created_at
                              ? new Date(memory.created_at).toLocaleDateString()
                              : "NO DATE"}{" "}
                            • {memory.source || "UNKNOWN"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          {/* Summarized Mode: Show only answer and citations */}
          {!isEmbeddingOnly &&
            !isSearching &&
            searchQuery.trim() &&
            searchResults !== null &&
            !processedAnswer &&
            uniqueCitations.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                No memories found for "{searchQuery}"
              </div>
            )}

          {/* Answer Section */}
          {!isSearching && processedAnswer && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Answer
              </div>
              <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                {processedAnswer}
              </p>
            </div>
          )}

          {/* Citations */}
          {!isSearching && uniqueCitations.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                Citations
              </div>
              <div className="space-y-1">
                {uniqueCitations.map((citation) => {
                  const title = citation.title || "Untitled Memory"
                  const url =
                    citation.url && citation.url !== "unknown"
                      ? citation.url
                      : null
                  return (
                    <div
                      key={`${citation.memory_id}-${citation.label}`}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="text-gray-500">[{citation.label}]</span>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-black hover:underline truncate"
                        >
                          {title}
                        </a>
                      ) : (
                        <span className="text-gray-700 truncate">{title}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const SpotlightSearch = memo(SpotlightSearchComponent)
SpotlightSearch.displayName = "SpotlightSearch"
