import React, { memo } from "react"

import type { Memory, MemoryType, SearchResult } from "../types/memory.type"

interface MemorySearchResultCardProps {
  result: SearchResult
  onClick: (memory: Memory) => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getScoreColor = (score?: number) => {
  if (!score) return "text-gray-500"
  if (score >= 0.8) return "text-green-600"
  if (score >= 0.6) return "text-yellow-600"
  return "text-red-600"
}

const getMemoryTypeBadge = (type?: MemoryType | null) => {
  if (!type) return null

  const badgeStyles: Record<
    MemoryType,
    { bg: string; text: string; border: string }
  > = {
    FACT: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
    },
    PREFERENCE: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
    },
    PROJECT: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-200",
    },
    LOG_EVENT: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-200",
    },
    REFERENCE: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-200",
    },
  }

  const style = badgeStyles[type]
  return (
    <span
      className={`text-xs font-mono ${style.bg} ${style.text} px-2 py-0.5 border ${style.border} rounded`}
    >
      {type.replace("_", " ")}
    </span>
  )
}

const getSearchTypeBadge = (type?: string) => {
  switch (type) {
    case "keyword":
      return (
        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 border border-blue-200">
          KEYWORD
        </span>
      )
    case "semantic":
      return (
        <span className="text-xs font-mono bg-purple-100 text-purple-800 px-2 py-1 border border-purple-200">
          SEMANTIC
        </span>
      )
    case "hybrid":
      return (
        <span className="text-xs font-mono bg-indigo-100 text-indigo-800 px-2 py-1 border border-indigo-200">
          HYBRID
        </span>
      )
    default:
      return null
  }
}

const MemorySearchResultCardComponent: React.FC<
  MemorySearchResultCardProps
> = ({ result, onClick }) => {
  const memory = result.memory

  return (
    <div
      className="bg-white border border-gray-200 p-4 hover:border-gray-400 transition-all duration-200 cursor-pointer"
      onClick={() => onClick(memory)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-mono font-semibold text-gray-900">
              {memory.title || "Untitled Memory"}
            </h3>
            {getMemoryTypeBadge(memory.memory_type)}
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-gray-500">
            <span>{formatDate(memory.created_at)}</span>
            <span>•</span>
            <span className="uppercase">{memory.source}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getSearchTypeBadge(result.search_type)}
          {result.blended_score && (
            <span
              className={`text-xs font-mono ${getScoreColor(result.blended_score)}`}
            >
              {(result.blended_score * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {memory.summary && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {memory.summary}
        </p>
      )}

      {memory.url && memory.url !== "unknown" && (
        <div className="flex items-center space-x-2 text-xs font-mono text-gray-500">
          <span>[URL]</span>
          <a
            href={memory.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-black truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {memory.url}
          </a>
        </div>
      )}

      {result.search_type === "hybrid" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-xs font-mono text-gray-500">
            <span>
              Keyword: {(result.keyword_score || 0 * 100).toFixed(0)}%
            </span>
            <span>
              Semantic: {(result.semantic_score || 0 * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const MemorySearchResultCard = memo(MemorySearchResultCardComponent)
MemorySearchResultCard.displayName = "MemorySearchResultCard"
export { MemorySearchResultCard }
