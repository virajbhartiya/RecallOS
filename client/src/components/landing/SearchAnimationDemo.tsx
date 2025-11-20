import React, { useEffect, useRef, useState } from "react"

import { mockMeshData } from "../../data/mock-mesh-data"
import type { MemoryMesh } from "../../types/memory.type"
import { MemoryMesh3DContainer } from "./MemoryMesh3D"

export const SearchAnimationDemo: React.FC<{ meshData?: MemoryMesh }> = ({
  meshData = mockMeshData,
}) => {
  const [animationPhase, setAnimationPhase] = useState<
    "idle" | "typing" | "searching" | "result"
  >("idle")
  const [query, setQuery] = useState("")
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  )
  const [pulseIntensity, setPulseIntensity] = useState(0)
  const [resultNodes, setResultNodes] = useState<string[]>([])
  const animationStarted = useRef(false)
  const timeoutsRef = useRef<Array<NodeJS.Timeout>>([])
  const intervalsRef = useRef<Array<NodeJS.Timeout>>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || animationStarted.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !animationStarted.current) {
          console.log("Section is visible, starting animation")
          animationStarted.current = true

          // Set typing phase immediately
          setAnimationPhase("typing")
          console.log("Phase set to typing, starting interval in 100ms")

          // Small delay to ensure state update is processed
          const initTimeout = setTimeout(() => {
            const fullQuery = "How to implement authentication in React?"
            let charIndex = 0

            console.log(
              "Starting typing interval, fullQuery length:",
              fullQuery.length
            )
            const typingInterval = setInterval(() => {
              if (charIndex < fullQuery.length) {
                const newQuery = fullQuery.substring(0, charIndex + 1)
                console.log("Typing character:", {
                  charIndex,
                  char: fullQuery[charIndex],
                  newQuery,
                })
                setQuery(newQuery)
                charIndex++
              } else {
                console.log("Typing complete, clearing interval")
                clearInterval(typingInterval)

                // Phase 2: Searching (highlight nodes)
                const searchTimeout = setTimeout(() => {
                  console.log("Setting phase to searching")
                  setAnimationPhase("searching")
                  // Select nodes relevant to React authentication (first 8 nodes)
                  const nodeIds = meshData.nodes.slice(0, 8).map((n) => n.id)
                  console.log("Highlighting nodes:", nodeIds)
                  setHighlightedNodes(new Set(nodeIds))
                  setPulseIntensity(1)

                  // Phase 3: Result - select most relevant nodes for React auth
                  const resultTimeout = setTimeout(() => {
                    console.log("Setting phase to result")
                    setAnimationPhase("result")
                    // Select the first 3 nodes which are most relevant: React Documentation, TypeScript Guide, GitHub Repository
                    const finalResultNodes = ["1", "2", "3"]
                    setResultNodes(finalResultNodes)
                    // Keep highlighting the result nodes, not all searched nodes
                    setHighlightedNodes(new Set(finalResultNodes))
                    setPulseIntensity(0.8)
                  }, 2000)
                  timeoutsRef.current.push(resultTimeout)
                }, 500)
                timeoutsRef.current.push(searchTimeout)
              }
            }, 80)

            intervalsRef.current.push(typingInterval)
            console.log("Typing interval created:", typingInterval)
          }, 100)

          timeoutsRef.current.push(initTimeout)

          // Disconnect observer once animation starts
          observer.disconnect()
        }
      },
      {
        threshold: 0.3, // Start when 30% of the section is visible
        rootMargin: "0px",
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      console.log("Cleaning up animation, resetting ref")
      timeoutsRef.current.forEach(clearTimeout)
      intervalsRef.current.forEach(clearInterval)
      timeoutsRef.current = []
      intervalsRef.current = []
    }
  }, [meshData])

  console.log("SearchAnimationDemo render:", {
    animationPhase,
    query,
    queryLength: query.length,
    highlightedNodes: highlightedNodes.size,
    resultNodes: resultNodes.length,
  })

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <MemoryMesh3DContainer
        meshData={meshData}
        highlightedNodes={highlightedNodes}
        pulseIntensity={pulseIntensity}
      />

      {/* Search Animation UI */}
      <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 z-10 px-2 sm:px-4 pointer-events-none">
        <div className="max-w-xl mx-auto">
          {/* Search Input */}
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-gray-500 flex-shrink-0">
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0 flex items-center">
                <span className="text-sm sm:text-base font-light text-gray-900 leading-normal">
                  {query || "\u00A0"}
                </span>
              </div>
              {animationPhase === "searching" && (
                <div className="animate-spin text-gray-500 flex-shrink-0">
                  <svg
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Result Summary - positioned to not cover mesh */}
          {animationPhase === "result" && resultNodes.length > 0 && (
            <div className="mt-2 bg-white/95 backdrop-blur-md border border-gray-300/50 rounded-md sm:rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2">
              <div className="text-[10px] sm:text-xs font-mono text-gray-600 uppercase tracking-wide mb-1 sm:mb-1.5">
                [{resultNodes.length}{" "}
                {resultNodes.length === 1 ? "RESULT" : "RESULTS"} FOUND]
              </div>
              <div className="text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2 leading-relaxed">
                Add a login API, store the returned token in httpOnly cookies,
                protect routes with a wrapper that checks auth state, fetch the
                user profile on app load, redirect to login when no valid
                session exists.
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                {resultNodes.map((nodeId, index) => {
                  const node = meshData.nodes.find((n) => n.id === nodeId)
                  if (!node) return null
                  return (
                    <div
                      key={nodeId}
                      className="text-[10px] sm:text-xs text-gray-700 leading-relaxed"
                      style={{
                        animation: `slideInUp 0.5s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      <span className="font-medium">
                        • {node.title || node.label}
                      </span>
                      <span className="text-gray-500 ml-1 sm:ml-2">
                        [{node.type}]
                      </span>
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
