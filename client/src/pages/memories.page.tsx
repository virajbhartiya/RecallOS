import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MemoryService } from "@/services/memory.service"
import { SearchService } from "@/services/search.service"
import { requireAuthToken } from "@/utils/user-id.util"
import { useNavigate } from "react-router-dom"

import type { Memory, MemorySearchResponse } from "@/types/memory.type"
import { MemoryMesh3D } from "@/components/MemoryMesh3D"
import { PageHeader } from "@/components/PageHeader"
import { SpotlightSearch } from "@/components/SpotlightSearch"

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
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false)
  const [spotlightSearchQuery, setSpotlightSearchQuery] = useState("")
  const [spotlightSearchResults, setSpotlightSearchResults] =
    useState<MemorySearchResponse | null>(null)
  const [spotlightSearchAnswer, setSpotlightSearchAnswer] = useState<
    string | null
  >(null)
  const [spotlightSearchCitations, setSpotlightSearchCitations] =
    useState<Array<{
      label: number
      memory_id: string
      title: string | null
      url: string | null
    }> | null>(null)
  const [spotlightSearchJobId, setSpotlightSearchJobId] = useState<
    string | null
  >(null)
  const [spotlightIsSearching, setSpotlightIsSearching] = useState(false)
  const [spotlightEmbeddingOnly, setSpotlightEmbeddingOnly] = useState(true)
  const spotlightAbortControllerRef = useRef<AbortController | null>(null)
  const spotlightDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  const handleNodeClick = useCallback(
    (memoryId: string) => {
      const memoryInfo = memories.find((m) => m.id === memoryId)
      if (memoryInfo) {
        setSelectedMemory(memoryInfo)
      }
      setClickedNodeId(memoryId)
    },
    [memories]
  )

  // Spotlight search handler
  const handleSpotlightSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSpotlightSearchResults(null)
        setSpotlightSearchAnswer(null)
        setSpotlightSearchCitations(null)
        setSpotlightIsSearching(false)
        return
      }

      // Cancel any existing search
      if (spotlightAbortControllerRef.current) {
        spotlightAbortControllerRef.current.abort()
      }

      spotlightAbortControllerRef.current = new AbortController()
      setSpotlightIsSearching(true)

      try {
        const signal = spotlightAbortControllerRef.current?.signal
        requireAuthToken()

        const response = await MemoryService.searchMemories(
          query,
          {},
          1,
          50,
          signal,
          undefined,
          spotlightEmbeddingOnly
        )

        if (signal?.aborted) return

        setSpotlightSearchResults(response)
        setSpotlightSearchAnswer(response.answer || null)
        setSpotlightSearchCitations(response.citations || null)

        if (response.job_id && !response.answer) {
          setSpotlightSearchJobId(response.job_id)
        } else {
          setSpotlightSearchJobId(null)
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return
        }
        // Error handling - could show error state here if needed
      } finally {
        if (!spotlightAbortControllerRef.current?.signal.aborted) {
          setSpotlightIsSearching(false)
        }
      }
    },
    [spotlightEmbeddingOnly]
  )

  // Debounced spotlight search effect
  useEffect(() => {
    if (spotlightDebounceTimeoutRef.current) {
      clearTimeout(spotlightDebounceTimeoutRef.current)
    }

    if (!spotlightSearchQuery.trim()) {
      setSpotlightSearchResults(null)
      setSpotlightSearchAnswer(null)
      setSpotlightSearchCitations(null)
      return
    }

    spotlightDebounceTimeoutRef.current = setTimeout(() => {
      if (spotlightSearchQuery.trim()) {
        handleSpotlightSearch(spotlightSearchQuery.trim())
      }
    }, 800)

    return () => {
      if (spotlightDebounceTimeoutRef.current) {
        clearTimeout(spotlightDebounceTimeoutRef.current)
      }
    }
  }, [spotlightSearchQuery, handleSpotlightSearch, spotlightEmbeddingOnly])

  // Poll for async LLM answer in spotlight
  useEffect(() => {
    if (!spotlightSearchJobId || spotlightSearchAnswer) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const status = await SearchService.getJob(spotlightSearchJobId)
        if (cancelled) return
        if (status.status === "completed") {
          if (status.answer) setSpotlightSearchAnswer(status.answer)
          if (status.citations) setSpotlightSearchCitations(status.citations)
          clearInterval(interval)
          setSpotlightSearchJobId(null)
        } else if (status.status === "failed") {
          clearInterval(interval)
          setSpotlightSearchJobId(null)
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [spotlightSearchJobId, spotlightSearchAnswer])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  // Keyboard shortcut to open spotlight (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsSpotlightOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Cleanup effect to cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (spotlightAbortControllerRef.current) {
        spotlightAbortControllerRef.current.abort()
      }
    }
  }, [])

  const highlightedMemoryIds = useMemo(
    () => [
      ...(clickedNodeId ? [clickedNodeId] : []),
      ...(selectedMemory ? [selectedMemory.id] : []),
    ],
    [clickedNodeId, selectedMemory]
  )

  const memorySources = useMemo(
    () => Object.fromEntries(memories.map((m) => [m.id, m.source || ""])),
    [memories]
  )

  const memoryUrls = useMemo(
    () => Object.fromEntries(memories.map((m) => [m.id, m.url || ""])),
    [memories]
  )

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
      <PageHeader pageName="Memories" />

      {/* Main Content */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)] relative">
        {/* Left Panel - Memory Mesh */}
        <div
          className="flex-1 relative order-2 md:order-1 h-[50vh] md:h-auto md:min-h-[calc(100vh-3.5rem)] border-b md:border-b-0 bg-white"
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
            highlightedMemoryIds={highlightedMemoryIds}
            memorySources={memorySources}
            memoryUrls={memoryUrls}
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
                    setIsSpotlightOpen(true)
                    setSpotlightSearchQuery("")
                    setSpotlightSearchResults(null)
                    setSpotlightSearchAnswer(null)
                    setSpotlightSearchCitations(null)
                  }}
                  className="text-xs font-medium text-gray-700 hover:text-black px-2 py-1 border border-gray-300 hover:border-black hover:bg-black hover:text-white transition-all rounded-none"
                >
                  Search
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
                  {spotlightSearchResults && spotlightSearchResults.results && (
                    <div className="flex items-center justify-between text-xs text-gray-900">
                      <span>Connections</span>
                      <span className="font-mono font-semibold">
                        {spotlightSearchResults.results.length}
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

        <SpotlightSearch
          isOpen={isSpotlightOpen}
          searchQuery={spotlightSearchQuery}
          searchResults={spotlightSearchResults}
          isSearching={spotlightIsSearching}
          searchAnswer={spotlightSearchAnswer}
          searchCitations={spotlightSearchCitations}
          isEmbeddingOnly={spotlightEmbeddingOnly}
          onEmbeddingOnlyChange={setSpotlightEmbeddingOnly}
          onSearchQueryChange={setSpotlightSearchQuery}
          onSelectMemory={(memory) => {
            setSelectedMemory(memory)
            setClickedNodeId(memory.id)
            setIsSpotlightOpen(false)
          }}
          onClose={() => {
            setIsSpotlightOpen(false)
            setSpotlightSearchQuery("")
            setSpotlightSearchResults(null)
            setSpotlightSearchAnswer(null)
            setSpotlightSearchCitations(null)
          }}
        />
      </div>
    </div>
  )
}
