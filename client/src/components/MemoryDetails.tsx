import React, { memo, useState } from "react"
import { Trash2 } from "lucide-react"

import type { Memory, MemorySearchResponse } from "../types/memory.type"

interface MemoryDetailsProps {
  selectedMemory: Memory | null
  searchQuery: string
  searchResults: MemorySearchResponse | null
  searchAnswer: string | null
  searchCitations: Array<{
    label: number
    memory_id: string
    title: string | null
    url: string | null
  }> | null
  onSelectMemory: (memoryId: string) => void
  onDeleteMemory: (memoryId: string) => void
}

const MemoryDetailContent: React.FC<{
  memory: Memory
  expandedContent: boolean
  onToggleExpand: () => void
  onDelete: () => void
}> = memo(({ memory, expandedContent, onToggleExpand, onDelete }) => (
  <div className="space-y-5">
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
          <span>
            {memory.created_at
              ? new Date(memory.created_at).toLocaleDateString()
              : "NO DATE"}
          </span>
          {memory.source && (
            <span className="inline-flex items-center gap-1 uppercase bg-gray-100 px-2 py-0.5 border border-gray-200 text-gray-700">
              {memory.source}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 border border-red-200 hover:border-red-300 transition-colors flex items-center space-x-1"
          title="Delete memory"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <h3 className="text-xl font-medium text-gray-900 leading-snug break-words mb-4">
        {memory.title || "Untitled Memory"}
      </h3>
    </div>

    {memory.summary ? (
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
          Summary
        </div>
        <p className="text-sm text-gray-800 leading-relaxed break-words">
          {memory.summary}
        </p>
      </div>
    ) : memory.content ? (
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
          Content
        </div>
        <p
          className={`text-sm text-gray-800 leading-relaxed break-words ${expandedContent ? "" : "line-clamp-10"}`}
        >
          {memory.content}
        </p>
        {memory.content && memory.content.length > 500 && (
          <button
            onClick={onToggleExpand}
            className="mt-2 text-xs font-medium text-gray-700 hover:text-black px-2 py-1 border border-gray-300 hover:border-black hover:bg-black hover:text-white transition-all rounded-none"
          >
            {expandedContent ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
    ) : null}

    {memory.url && memory.url !== "unknown" && (
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
          Source
        </div>
        <a
          href={memory.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-black break-all hover:underline"
        >
          {memory.url}
        </a>
      </div>
    )}
  </div>
))

MemoryDetailContent.displayName = "MemoryDetailContent"

const SearchResultsSection: React.FC<{
  answer: string | null
  citations: Array<{
    label: number
    memory_id: string
    title: string | null
    url: string | null
  }> | null
  onSelectMemory: (memoryId: string) => void
}> = memo(({ answer, citations, onSelectMemory }) => {
  if (!answer && (!citations || citations.length === 0)) return null

  return (
    <div className="space-y-4 mb-6">
      {answer && (
        <div className="bg-gray-50 border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
            Answer
          </div>
          <p className="text-sm text-gray-900 leading-relaxed break-words whitespace-pre-wrap">
            {answer}
          </p>
        </div>
      )}
      {citations && citations.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
            Citations
          </div>
          <div className="space-y-2">
            {citations.map((citation, idx) => {
              const title = citation.title || "Untitled Memory"
              const url =
                citation.url && citation.url !== "unknown" ? citation.url : null
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-500">
                      [{citation.label ?? idx + 1}]
                    </span>
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
                        onClick={() => onSelectMemory(citation.memory_id)}
                        className="text-blue-600 hover:text-black hover:underline truncate text-left"
                      >
                        {title}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectMemory(citation.memory_id)}
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
  )
})

SearchResultsSection.displayName = "SearchResultsSection"

const MemoryDetailsComponent: React.FC<MemoryDetailsProps> = ({
  selectedMemory,
  searchQuery,
  searchResults,
  searchAnswer,
  searchCitations,
  onSelectMemory,
  onDeleteMemory,
}) => {
  const [expandedContent, setExpandedContent] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-white">
      {searchQuery.trim() && searchResults && (
        <SearchResultsSection
          answer={searchAnswer}
          citations={searchCitations}
          onSelectMemory={onSelectMemory}
        />
      )}
      {selectedMemory ? (
        <MemoryDetailContent
          memory={selectedMemory}
          expandedContent={expandedContent}
          onToggleExpand={() => setExpandedContent(!expandedContent)}
          onDelete={() => onDeleteMemory(selectedMemory.id)}
        />
      ) : searchQuery.trim() &&
        searchResults &&
        (searchAnswer ||
          (searchCitations && searchCitations.length > 0)) ? null : (
        <div className="flex items-center justify-center h-full text-sm text-gray-500">
          {searchQuery.trim()
            ? "Select a memory from search results"
            : "Select a memory from the list"}
        </div>
      )}
    </div>
  )
}

const MemoryDetails = memo(MemoryDetailsComponent)
MemoryDetails.displayName = "MemoryDetails"
export { MemoryDetails }
