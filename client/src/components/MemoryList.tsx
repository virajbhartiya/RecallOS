import React, { memo } from 'react'
import { Trash2 } from 'lucide-react'
import type { Memory, MemorySearchResponse } from '../types/memory'

interface MemoryListProps {
  memories: Memory[]
  searchQuery: string
  searchResults: MemorySearchResponse | null
  isSearching: boolean
  selectedMemory: Memory | null
  onSelectMemory: (memory: Memory) => void
  onDeleteMemory: (memoryId: string) => void
  onSearchQueryChange: (query: string) => void
}

const MemoryListItem: React.FC<{
  memory: Memory
  isSelected: boolean
  score?: number
  onSelect: () => void
  onDelete: () => void
}> = memo(({ memory, isSelected, score, onSelect, onDelete }) => (
  <div
    className={`group w-full border-b border-gray-100 transition-colors relative ${
      isSelected
        ? 'bg-black text-white border-l-2 border-l-black hover:bg-gray-900'
        : 'hover:bg-gray-50'
    }`}
  >
    <button onClick={onSelect} className="w-full text-left p-3 pr-10">
      <div className="flex items-center justify-between mb-1">
        <div className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
          {memory.title || 'Untitled Memory'}
        </div>
        {score !== undefined && (
          <span className={`text-[10px] font-mono ml-2 flex-shrink-0 ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
            {(score * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div className={`text-[10px] font-mono ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
        {memory.created_at ? new Date(memory.created_at).toLocaleDateString() : 'NO DATE'} • {memory.source || 'UNKNOWN'}
      </div>
      {memory.summary && (
        <div className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? 'text-gray-300' : 'text-gray-600'}`}>
          {memory.summary}
        </div>
      )}
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
      className={`absolute right-2 top-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-gray-400 hover:text-red-300' : 'text-gray-400 hover:text-red-600'}`}
      title="Delete memory"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
))

MemoryListItem.displayName = 'MemoryListItem'

const MemoryListComponent: React.FC<MemoryListProps> = ({
  memories,
  searchQuery,
  searchResults,
  isSearching,
  selectedMemory,
  onSelectMemory,
  onDeleteMemory,
  onSearchQueryChange,
}) => {
  const sortedMemories = React.useMemo(() => {
    return [...memories].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [memories])

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-black rounded-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="p-4 text-center text-sm text-gray-500">
            Searching...
          </div>
        )}
        {!isSearching && searchQuery.trim() && searchResults?.results && searchResults.results.length > 0 ? (
          searchResults.results.map((result) => (
            <MemoryListItem
              key={result.memory.id}
              memory={result.memory}
              isSelected={selectedMemory?.id === result.memory.id}
              score={result.blended_score}
              onSelect={() => {
                onSelectMemory(result.memory)
              }}
              onDelete={() => onDeleteMemory(result.memory.id)}
            />
          ))
        ) : !isSearching && searchQuery.trim() && searchResults?.results && searchResults.results.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No results found
          </div>
        ) : !searchQuery.trim() ? (
          sortedMemories.length > 0 ? (
            sortedMemories.map((memory) => (
              <MemoryListItem
                key={memory.id}
                memory={memory}
                isSelected={selectedMemory?.id === memory.id}
                onSelect={() => onSelectMemory(memory)}
                onDelete={() => onDeleteMemory(memory.id)}
              />
            ))
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              No memories available
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}

const MemoryList = memo(MemoryListComponent)
MemoryList.displayName = 'MemoryList'
export { MemoryList }

