import React, { memo } from 'react'
import { MemoryList } from './MemoryList'
import { MemoryDetails } from './MemoryDetails'
import type { Memory, MemorySearchResponse } from '../types/memory'

interface MemoryDialogProps {
  isOpen: boolean
  memories: Memory[]
  searchQuery: string
  searchResults: MemorySearchResponse | null
  isSearching: boolean
  searchAnswer: string | null
  searchCitations: Array<{ label: number; memory_id: string; title: string | null; url: string | null }> | null
  selectedMemory: Memory | null
  onClose: () => void
  onSelectMemory: (memory: Memory) => void
  onSelectMemoryById: (memoryId: string) => void
  onDeleteMemory: (memoryId: string) => void
  onSearchQueryChange: (query: string) => void
}

const MemoryDialogComponent: React.FC<MemoryDialogProps> = ({
  isOpen,
  memories,
  searchQuery,
  searchResults,
  isSearching,
  searchAnswer,
  searchCitations,
  selectedMemory,
  onClose,
  onSelectMemory,
  onSelectMemoryById,
  onDeleteMemory,
  onSearchQueryChange,
}) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 shadow-xl w-[1200px] h-[800px] max-w-[95vw] max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-medium text-gray-900">Memory Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden bg-white">
          <MemoryList
            memories={memories}
            searchQuery={searchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            selectedMemory={selectedMemory}
            onSelectMemory={onSelectMemory}
            onDeleteMemory={onDeleteMemory}
            onSearchQueryChange={onSearchQueryChange}
          />
          <MemoryDetails
            selectedMemory={selectedMemory}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchAnswer={searchAnswer}
            searchCitations={searchCitations}
            onSelectMemory={onSelectMemoryById}
            onDeleteMemory={onDeleteMemory}
          />
        </div>
      </div>
    </div>
  )
}

const MemoryDialog = memo(MemoryDialogComponent)
MemoryDialog.displayName = 'MemoryDialog'
export { MemoryDialog }

