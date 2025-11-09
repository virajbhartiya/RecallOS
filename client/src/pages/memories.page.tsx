import React, { useCallback, useEffect, useRef, useState } from "react"
import { MemoryService } from "@/services/memory.service"
import { SearchService } from "@/services/search.service"
import { requireAuthToken } from "@/utils/user-id.util"
import { useNavigate } from "react-router-dom"

import type {
  Memory,
  MemorySearchResponse,
  SearchFilters,
} from "@/types/memory.type"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MemoryDialog } from "@/components/MemoryDialog"
import { MemoryMesh3D } from "@/components/MemoryMesh3D"
import { PendingJobsPanel } from "@/components/PendingJobsPanel"

export const Memories: React.FC = () => {
  const navigate = useNavigate()
  const [memories, setMemories] = useState<Memory[]>([])
  const [totalMemoryCount, setTotalMemoryCount] = useState<number>(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    try {
      requireAuthToken()
      setIsAuthenticated(true)
    } catch (error) {
      navigate("/login")
    }
  }, [navigate])

  const similarityThreshold = 0.3
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPendingJobsOpen, setIsPendingJobsOpen] = useState(false)
  const [listSearchQuery, setListSearchQuery] = useState("")
  const [dialogSearchResults, setDialogSearchResults] =
    useState<MemorySearchResponse | null>(null)
  const [dialogSearchAnswer, setDialogSearchAnswer] = useState<string | null>(
    null
  )
  const [dialogSearchCitations, setDialogSearchCitations] = useState<Array<{
    label: number
    memory_id: string
    title: string | null
    url: string | null
  }> | null>(null)
  const [dialogSearchJobId, setDialogSearchJobId] = useState<string | null>(
    null
  )
  const [dialogIsSearching, setDialogIsSearching] = useState(false)
  const dialogAbortControllerRef = useRef<AbortController | null>(null)
  const dialogDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [searchResults, setSearchResults] =
    useState<MemorySearchResponse | null>(null)
  const [searchAnswer, setSearchAnswer] = useState<string | null>(null)

  const [searchJobId, setSearchJobId] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)

  const [searchQuery, setSearchQuery] = useState<string>("")
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    memoryId: string | null
  }>({
    isOpen: false,
    memoryId: null,
  })

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchMemories = useCallback(async () => {
    try {
      // Require authentication
      requireAuthToken()

      const [memoriesData, totalCount] = await Promise.all([
        MemoryService.getMemoriesWithTransactionDetails(10000),
        MemoryService.getUserMemoryCount(),
      ])

      setMemories(memoriesData || [])
      setTotalMemoryCount(totalCount || 0)
    } catch (err) {
      console.error("Error fetching memories:", err)
    }
  }, [])

  const handleDeleteMemoryClick = useCallback((memoryId: string) => {
    setDeleteConfirm({ isOpen: true, memoryId })
  }, [])

  const handleDeleteMemoryConfirm = useCallback(async () => {
    if (!deleteConfirm.memoryId) return

    const memoryId = deleteConfirm.memoryId
    setDeleteConfirm({ isOpen: false, memoryId: null })

    try {
      requireAuthToken()
      await MemoryService.deleteMemory(memoryId)

      if (selectedMemory?.id === memoryId) {
        setSelectedMemory(null)
        setClickedNodeId(null)
      }

      await fetchMemories()
    } catch (err) {
      const error = err as { message?: string }
      console.error("Error deleting memory:", err)
      alert(error.message || "Failed to delete memory")
    }
  }, [deleteConfirm.memoryId, selectedMemory, fetchMemories])

  const handleNodeClick = useCallback(
    (memoryId: string) => {
      const memoryInfo = memories.find((m) => m.id === memoryId)
      if (memoryInfo) {
        setSelectedMemory(memoryInfo)
        setIsDialogOpen(true)
        setListSearchQuery("")
        setDialogSearchResults(null)
        setDialogSearchAnswer(null)
        setDialogSearchCitations(null)
      }
      setClickedNodeId(memoryId)
    },
    [memories]
  )

  const selectMemoryById = useCallback(
    (memoryId: string) => {
      const mem =
        memories.find((m) => m.id === memoryId) ||
        dialogSearchResults?.results?.find((r) => r.memory.id === memoryId)
          ?.memory
      if (mem) {
        setSelectedMemory(mem)
        setClickedNodeId(mem.id)
      }
    },
    [memories, dialogSearchResults]
  )

  const handleSearch = useCallback(
    async (query: string, filters: SearchFilters) => {
      if (!query.trim()) return

      // Cancel any existing search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setSearchResults(null)
      setIsSearchMode(true)
      setSearchAnswer(null)

      try {
        const signal = abortControllerRef.current?.signal

        // Require authentication
        requireAuthToken()

        // Use the working /api/search endpoint for all searches
        const response = await MemoryService.searchMemories(
          query,
          filters,
          1,
          50,
          signal
        )

        // Check if the search was aborted before setting results
        if (signal?.aborted) return

        // Set all the response data immediately
        setSearchResults(response)
        setSearchAnswer(response.answer || null)

        // Only set job_id for polling if we don't have an immediate answer
        if (response.job_id && !response.answer) {
          setSearchJobId(response.job_id)
        } else {
          setSearchJobId(null)
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return
        }
        // Only set error if not aborted
        if (!abortControllerRef.current?.signal.aborted) {
          // Error handling can be added here if needed
        }
      } finally {
        // Only set searching to false if not aborted
        if (!abortControllerRef.current?.signal.aborted) {
          // Cleanup can be added here if needed
        }
      }
    },
    []
  )

  const handleClearSearch = useCallback(() => {
    setSearchResults(null)
    setSearchAnswer(null)
    setSearchJobId(null)
    setIsSearchMode(false)
    setSearchQuery("")
  }, [])

  // Poll for async LLM answer if job id present (only if answer not already available)
  useEffect(() => {
    if (!searchJobId || searchAnswer) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const status = await SearchService.getJob(searchJobId)
        if (cancelled) return
        if (status.status === "completed") {
          if (status.answer) {
            setSearchAnswer(status.answer)
          }
          clearInterval(interval)
          setSearchJobId(null)
        } else if (status.status === "failed") {
          clearInterval(interval)
          setSearchJobId(null)
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [searchJobId, searchAnswer, searchResults])

  // Dialog search handler
  const handleDialogSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setDialogSearchResults(null)
      setDialogSearchAnswer(null)
      setDialogSearchCitations(null)
      setDialogIsSearching(false)
      return
    }

    // Cancel any existing search
    if (dialogAbortControllerRef.current) {
      dialogAbortControllerRef.current.abort()
    }

    dialogAbortControllerRef.current = new AbortController()
    setDialogIsSearching(true)

    try {
      const signal = dialogAbortControllerRef.current?.signal
      requireAuthToken()

      const response = await MemoryService.searchMemories(
        query,
        {},
        1,
        50,
        signal
      )

      if (signal?.aborted) return

      setDialogSearchResults(response)
      setDialogSearchAnswer(response.answer || null)
      setDialogSearchCitations(response.citations || null)

      if (response.job_id && !response.answer) {
        setDialogSearchJobId(response.job_id)
      } else {
        setDialogSearchJobId(null)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return
      }
      // Error handling - could show error state here if needed
    } finally {
      if (!dialogAbortControllerRef.current?.signal.aborted) {
        setDialogIsSearching(false)
      }
    }
  }, [])

  // Debounced dialog search effect
  useEffect(() => {
    if (dialogDebounceTimeoutRef.current) {
      clearTimeout(dialogDebounceTimeoutRef.current)
    }

    if (!listSearchQuery.trim()) {
      setDialogSearchResults(null)
      setDialogSearchAnswer(null)
      setDialogSearchCitations(null)
      return
    }

    dialogDebounceTimeoutRef.current = setTimeout(() => {
      if (listSearchQuery.trim()) {
        handleDialogSearch(listSearchQuery.trim())
      }
    }, 800)

    return () => {
      if (dialogDebounceTimeoutRef.current) {
        clearTimeout(dialogDebounceTimeoutRef.current)
      }
    }
  }, [listSearchQuery, handleDialogSearch])

  // Poll for async LLM answer in dialog
  useEffect(() => {
    if (!dialogSearchJobId || dialogSearchAnswer) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const status = await SearchService.getJob(dialogSearchJobId)
        if (cancelled) return
        if (status.status === "completed") {
          if (status.answer) setDialogSearchAnswer(status.answer)
          if (status.citations) setDialogSearchCitations(status.citations)
          clearInterval(interval)
          setDialogSearchJobId(null)
        } else if (status.status === "failed") {
          clearInterval(interval)
          setDialogSearchJobId(null)
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [dialogSearchJobId, dialogSearchAnswer])

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // If search query is empty, clear search immediately
    if (!searchQuery.trim()) {
      handleClearSearch()
      return
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      // Only search if the query is still non-empty (user hasn't cleared it)
      if (searchQuery.trim()) {
        handleSearch(searchQuery.trim(), {})
      }
    }, 800) // Increased debounce time to 800ms for better UX

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchQuery, handleSearch, handleClearSearch])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  // Cleanup effect to cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (dialogAbortControllerRef.current) {
        dialogAbortControllerRef.current.abort()
      }
    }
  }, [])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{
        backgroundImage: "linear-gradient(135deg, #f9fafb, #ffffff, #f3f4f6)",
      }}
    >
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => (window.location.href = "/")}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
              >
                <span className="relative z-10">← Home</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">
                  R
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Memory Mesh
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => (window.location.href = "/analytics")}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Analytics
              </button>
              <button
                onClick={() => (window.location.href = "/profile")}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={() => setIsPendingJobsOpen(true)}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Pending Jobs
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-16 sm:h-20" aria-hidden="true" />

      {/* Main Content */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] relative">
        {/* Left Panel - Memory Mesh */}
        <div
          className="flex-1 relative order-2 md:order-1 h-[50vh] md:h-auto md:min-h-[calc(100vh-4rem)] sm:md:min-h-[calc(100vh-5rem)] border-b md:border-b-0 bg-white"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        >
          {/* 3D Memory Mesh Canvas */}
          <MemoryMesh3D
            className="w-full h-full"
            onNodeClick={handleNodeClick}
            similarityThreshold={similarityThreshold}
            selectedMemoryId={clickedNodeId || undefined}
            highlightedMemoryIds={[
              ...(isSearchMode && searchResults && searchResults.results
                ? searchResults.results.map((r) => r.memory.id)
                : []),
              ...(clickedNodeId ? [clickedNodeId] : []),
              ...(selectedMemory ? [selectedMemory.id] : []),
            ]}
            memorySources={{
              ...Object.fromEntries(
                memories.map((m) => [m.id, m.source || ""])
              ),
              ...Object.fromEntries(
                (searchResults?.results || []).map((r) => [
                  r.memory.id,
                  r.memory.source || "",
                ])
              ),
            }}
            memoryUrls={{
              ...Object.fromEntries(memories.map((m) => [m.id, m.url || ""])),
              ...Object.fromEntries(
                (searchResults?.results || []).map((r) => [
                  r.memory.id,
                  r.memory.url || "",
                ])
              ),
            }}
          />

          {/* Corner brand/label */}
          <div className="pointer-events-none absolute left-4 top-4 text-xs font-mono text-gray-500 uppercase tracking-wider">
            Memory Mesh
          </div>

          {/* Legend Overlay (top-right) */}
          <div className="absolute right-4 top-4 z-20 max-w-[240px]">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Legend
                </span>
                <button
                  onClick={() => {
                    setIsDialogOpen(true)
                    setListSearchQuery("")
                    setDialogSearchResults(null)
                    setDialogSearchAnswer(null)
                    setDialogSearchCitations(null)
                    setSelectedMemory(null)
                    setClickedNodeId(null)
                  }}
                  className="text-xs font-medium text-gray-700 hover:text-black px-2 py-1 border border-gray-300 hover:border-black hover:bg-black hover:text-white transition-all rounded-none"
                >
                  Browse
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Statistics
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-900">
                    <span>Nodes</span>
                    <span className="font-mono font-semibold">
                      {totalMemoryCount || memories.length}
                    </span>
                  </div>
                  {searchResults && searchResults.results && (
                    <div className="flex items-center justify-between text-xs text-gray-900">
                      <span>Connections</span>
                      <span className="font-mono font-semibold">
                        {searchResults.results.length}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Node Types
                  </div>
                  <div className="space-y-1.5">
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />{" "}
                      Browser/Extension
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
                      Manual/Docs
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />{" "}
                      Other
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Connections
                  </div>
                  <div className="space-y-1.5">
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-4 h-[1.5px] bg-blue-500" />
                      Strong (&gt;85%)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-4 h-[1px] bg-sky-400" />
                      Medium (&gt;75%)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span className="inline-block w-4 h-[0.5px] bg-gray-400" />
                      Weak (&lt;75%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <MemoryDialog
          isOpen={isDialogOpen}
          memories={memories}
          searchQuery={listSearchQuery}
          searchResults={dialogSearchResults}
          isSearching={dialogIsSearching}
          searchAnswer={dialogSearchAnswer}
          searchCitations={dialogSearchCitations}
          selectedMemory={selectedMemory}
          onClose={() => {
            setIsDialogOpen(false)
            setSelectedMemory(null)
            setClickedNodeId(null)
          }}
          onSelectMemory={(memory) => {
            setSelectedMemory(memory)
            setClickedNodeId(memory.id)
          }}
          onSelectMemoryById={selectMemoryById}
          onDeleteMemory={handleDeleteMemoryClick}
          onSearchQueryChange={setListSearchQuery}
        />

        <PendingJobsPanel
          isOpen={isPendingJobsOpen}
          onClose={() => setIsPendingJobsOpen(false)}
        />

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Memory"
          message="Are you sure you want to delete this memory? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteMemoryConfirm}
          onCancel={() => setDeleteConfirm({ isOpen: false, memoryId: null })}
        />
      </div>
    </div>
  )
}
