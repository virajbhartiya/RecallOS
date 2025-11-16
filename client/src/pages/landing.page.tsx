import React, { useEffect, useState, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Line, OrbitControls, Text } from "@react-three/drei"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"

import { ConsoleButton, Section } from "../components/sections"
import type { MemoryMesh, MemoryMeshEdge } from "../types/memory.type"

const WaitlistForm = ({ compact = false }: { compact?: boolean }) => {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSubmitted(true)
    setIsSubmitting(false)
    setEmail("")
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-3">✓</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          You're on the list!
        </h3>
        <p className="text-sm text-gray-600">
          We'll send you an email when Cognia is ready.
        </p>
        {!compact && (
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 text-sm text-gray-700 hover:text-black underline"
          >
            Add another email
          </button>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-none bg-white/80 backdrop-blur"
            placeholder="your@email.com"
          />
          <ConsoleButton
            variant="console_key"
            className="group relative overflow-hidden rounded-none px-6 py-3 transition-all duration-200 hover:shadow-md disabled:opacity-50 whitespace-nowrap"
            type="submit"
            disabled={isSubmitting}
          >
            <span className="relative z-10 text-sm font-medium">
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </span>
            <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
          </ConsoleButton>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Be among the first to experience Cognia. No spam, unsubscribe anytime.
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-none bg-white"
          placeholder="your@email.com"
        />
      </div>
      <ConsoleButton
        variant="console_key"
        className="w-full group relative overflow-hidden rounded-none px-6 py-3 transition-all duration-200 hover:shadow-md disabled:opacity-50"
        type="submit"
        disabled={isSubmitting}
      >
        <span className="relative z-10 text-sm font-medium">
          {isSubmitting ? "Joining..." : "Join Waitlist"}
        </span>
        <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
      </ConsoleButton>
      <p className="text-xs text-gray-500 text-center">
        We respect your privacy. No spam, unsubscribe anytime.
      </p>
    </form>
  )
}

const nodeColors = {
  manual: "#22c55e",
  browser: "#3b82f6",
  extension: "#3b82f6",
  reasoning: "#a855f7",
  ai: "#a855f7",
} as Record<string, string>

const resolveNodeColor = (rawType?: string, url?: string): string => {
  const key = (rawType || "").toLowerCase()
  const href = (url || "").toLowerCase()

  if (key && nodeColors[key]) {
    return nodeColors[key]
  }

  if (href) {
    if (/github\.com|gitlab\.com|bitbucket\.org/.test(href)) return "#3b82f6"
    if (/npmjs\.com|pypi\.org|crates\.io|rubygems\.org/.test(href))
      return "#22c55e"
    if (/docs\.|developer\.|readthedocs|mdn\.|dev\.docs|learn\./.test(href))
      return "#22c55e"
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(href)) return "#3b82f6"
    if (/mail\.google\.com|gmail\.com|outlook\.live\.com/.test(href))
      return "#22c55e"
  }

  return nodeColors[key] || "#6b7280"
}

const MemoryNodePreview: React.FC<{
  position: [number, number, number]
  color: string
  importance?: number
  label?: string
  isHighlighted?: boolean
  pulseIntensity?: number
}> = ({ position, color, importance = 0.5, label, isHighlighted = false, pulseIntensity = 0 }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const textRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [hovered, setHovered] = useState(false)

  const baseSize = 0.015 + importance * 0.008
  const size = baseSize

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return
    const nodePosition = groupRef.current.position
    const distance = camera.position.distanceTo(nodePosition)
    const fovRad =
      camera instanceof THREE.PerspectiveCamera && camera.fov
        ? (camera.fov * Math.PI) / 180
        : (60 * Math.PI) / 180
    const worldPerceivedScale = Math.tan(fovRad / 2) * 2
    const dynamicScale = Math.min(
      8,
      Math.max(0.5, distance * worldPerceivedScale * 0.1)
    )
    const hoverScale = hovered ? 1.3 : 1.0
    const pulseScale = isHighlighted ? 1 + Math.sin(state.clock.elapsedTime * 3) * pulseIntensity * 0.3 : 1.0
    meshRef.current.scale.setScalar(dynamicScale * hoverScale * pulseScale)

    if (textRef.current) {
      textRef.current.lookAt(camera.position)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial
          color={isHighlighted ? "#3b82f6" : color}
          metalness={0.3}
          roughness={0.4}
          emissive={isHighlighted ? "#3b82f6" : color}
          emissiveIntensity={isHighlighted ? 0.6 : hovered ? 0.4 : 0.2}
        />
      </mesh>
      {label && (
        <group ref={textRef}>
          <Text
            position={[0, size * 12, 0]}
            fontSize={0.03}
            color="#000000"
            anchorX="center"
            anchorY="middle"
            maxWidth={5}
            outlineWidth={0.03}
            outlineColor="#ffffff"
            outlineOpacity={1}
            depthOffset={-1}
          >
            {label.length > 30 ? `${label.substring(0, 30)}...` : label}
          </Text>
        </group>
      )}
    </group>
  )
}

const MemoryEdgePreview: React.FC<{
  start: [number, number, number]
  end: [number, number, number]
  similarity: number
}> = ({ start, end, similarity }) => {
  const points = useMemo(
    () => [new THREE.Vector3(...start), new THREE.Vector3(...end)],
    [start, end]
  )

  const getLineColor = (similarity: number) => {
    if (similarity > 0.85) return "#3b82f6"
    if (similarity > 0.75) return "#38bdf8"
    return "#9ca3af"
  }

  const color = getLineColor(similarity)
  const opacity = similarity > 0.75 ? 0.8 : similarity > 0.5 ? 0.6 : 0.4
  const lineWidth = similarity > 0.85 ? 0.6 : similarity > 0.75 ? 0.5 : 0.3

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={false}
      toneMapped={false}
      depthTest={true}
      depthWrite={false}
    />
  )
}

const RotatingMesh: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  return <group ref={groupRef}>{children}</group>
}

const MemoryMesh3DPreview: React.FC<{ 
  meshData: MemoryMesh
  highlightedNodes?: Set<string>
  pulseIntensity?: number
}> = ({
  meshData,
  highlightedNodes = new Set(),
  pulseIntensity = 0,
}) => {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 0, 3.5)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const nodes = useMemo(() => {
    if (!meshData?.nodes?.length) return []

    const nodeCount = meshData.nodes.length
    const sphereRadius = 1.2

    const normalizedPositions: [number, number, number][] = new Array(nodeCount)
    
    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.acos(-1 + (2 * i) / nodeCount)
      const phi = Math.sqrt(nodeCount * Math.PI) * theta
      
      const x = sphereRadius * Math.cos(phi) * Math.sin(theta)
      const y = sphereRadius * Math.sin(phi) * Math.sin(theta)
      const z = sphereRadius * Math.cos(theta)
      
      normalizedPositions[i] = [x, y, z]
    }

    let sumX = 0
    let sumY = 0
    let sumZ = 0
    for (let i = 0; i < nodeCount; i++) {
      sumX += normalizedPositions[i][0]
      sumY += normalizedPositions[i][1]
      sumZ += normalizedPositions[i][2]
    }
    const finalCenterX = sumX / nodeCount
    const finalCenterY = sumY / nodeCount
    const finalCenterZ = sumZ / nodeCount

    const result = new Array(nodeCount)
    for (let i = 0; i < nodeCount; i++) {
      const n = meshData.nodes[i]
      const pos = normalizedPositions[i]
      const finalPos: [number, number, number] = [
        pos[0] - finalCenterX,
        pos[1] - finalCenterY,
        pos[2] - finalCenterZ,
      ]

      const color = resolveNodeColor(String(n.type))

      result[i] = {
        id: n.id,
        position: finalPos,
        color,
        importance: n.importance_score,
        label: n.title || n.label || "",
      }
    }

    return result as Array<{
      id: string
      position: [number, number, number]
      color: string
      importance?: number
      label?: string
    }>
  }, [meshData])

  const edges = useMemo(() => {
    if (!meshData?.edges?.length) return []

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    const groups = new Map<string, MemoryMeshEdge[]>()
    meshData.edges.forEach((e: MemoryMeshEdge) => {
      if (e.source === e.target) return
      const [a, b] =
        e.source < e.target ? [e.source, e.target] : [e.target, e.source]
      const key = `${a}__${b}`
      const list = groups.get(key) || []
      list.push(e)
      groups.set(key, list)
    })

    const result: Array<{
      start: [number, number, number]
      end: [number, number, number]
      similarity: number
    }> = []

    groups.forEach((edgesForPair: MemoryMeshEdge[]) => {
      const best = edgesForPair.reduce<MemoryMeshEdge | undefined>(
        (prev, curr) => {
          if (prev == null) return curr
          const ps =
            typeof prev.similarity_score === "number"
              ? prev.similarity_score
              : -Infinity
          const cs =
            typeof curr.similarity_score === "number"
              ? curr.similarity_score
              : -Infinity
          return cs > ps ? curr : prev
        },
        edgesForPair[0]
      ) as MemoryMeshEdge

      const sourceNode = nodeMap.get(best.source)
      const targetNode = nodeMap.get(best.target)

      if (sourceNode && targetNode) {
        result.push({
          start: sourceNode.position,
          end: targetNode.position,
          similarity: best.similarity_score || 0.5,
        })
      }
    })

    return result
  }, [meshData, nodes])

  return (
    <>
      <fog attach="fog" args={["#f9fafb", 1.5, 6]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 8]} intensity={1.0} />
      <directionalLight position={[-10, -10, -8]} intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />
      <gridHelper args={[10, 10, "#e5e7eb", "#f3f4f6"]} position={[0, -2, 0]} />

      <RotatingMesh>
        {nodes.map((node) => (
          <MemoryNodePreview
            key={node.id}
            position={node.position}
            color={node.color}
            importance={node.importance}
            label={node.label}
            isHighlighted={highlightedNodes.has(node.id)}
            pulseIntensity={highlightedNodes.has(node.id) ? pulseIntensity : 0}
          />
        ))}

        {edges.map((edge, index) => (
          <MemoryEdgePreview
            key={`edge-${index}-${edge.start.join(",")}-${edge.end.join(",")}`}
            start={edge.start}
            end={edge.end}
            similarity={edge.similarity}
          />
        ))}
      </RotatingMesh>
    </>
  )
}

const ControlsUpdater: React.FC<{
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}> = ({ controlsRef }) => {
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  })
  return null
}

const MemoryMesh3DContainer: React.FC<{ 
  meshData: MemoryMesh
  highlightedNodes?: Set<string>
  pulseIntensity?: number
}> = ({
  meshData,
  highlightedNodes = new Set(),
  pulseIntensity = 0,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  return (
      <Canvas
      camera={{
        position: [0, 0, 3.5],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      style={{ background: "transparent" }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <MemoryMesh3DPreview 
        meshData={meshData} 
        highlightedNodes={highlightedNodes}
        pulseIntensity={pulseIntensity}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={false}
        enableRotate={true}
        zoomToCursor={true}
        minDistance={2}
        maxDistance={8}
        zoomSpeed={1.2}
        panSpeed={0.8}
        rotateSpeed={0.5}
        target={[0, 0, 0]}
        enableDamping={true}
        dampingFactor={0.05}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      <ControlsUpdater controlsRef={controlsRef} />
    </Canvas>
  )
}

const SearchAnimationDemo: React.FC<{ meshData: MemoryMesh }> = ({ meshData }) => {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'typing' | 'searching' | 'result'>('idle')
  const [query, setQuery] = useState('')
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
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
          console.log('Section is visible, starting animation')
          animationStarted.current = true
          
          // Set typing phase immediately
          setAnimationPhase('typing')
          console.log('Phase set to typing, starting interval in 100ms')
          
          // Small delay to ensure state update is processed
          const initTimeout = setTimeout(() => {
            const fullQuery = "How to implement authentication in React?"
            let charIndex = 0
            
            console.log('Starting typing interval, fullQuery length:', fullQuery.length)
            const typingInterval = setInterval(() => {
              if (charIndex < fullQuery.length) {
                const newQuery = fullQuery.substring(0, charIndex + 1)
                console.log('Typing character:', { charIndex, char: fullQuery[charIndex], newQuery })
                setQuery(newQuery)
                charIndex++
              } else {
                console.log('Typing complete, clearing interval')
                clearInterval(typingInterval)
                
                // Phase 2: Searching (highlight nodes)
                const searchTimeout = setTimeout(() => {
                  console.log('Setting phase to searching')
                  setAnimationPhase('searching')
                  const nodeIds = meshData.nodes.slice(0, 8).map(n => n.id)
                  console.log('Highlighting nodes:', nodeIds)
                  setHighlightedNodes(new Set(nodeIds))
                  setPulseIntensity(1)
                  
                // Phase 3: Result
                const resultTimeout = setTimeout(() => {
                  console.log('Setting phase to result')
                  setAnimationPhase('result')
                  const finalResultNodes = nodeIds.slice(0, 3)
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
            console.log('Typing interval created:', typingInterval)
          }, 100)
          
          timeoutsRef.current.push(initTimeout)
          
          // Disconnect observer once animation starts
          observer.disconnect()
        }
      },
      {
        threshold: 0.3, // Start when 30% of the section is visible
        rootMargin: '0px'
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      console.log('Cleaning up animation, resetting ref')
      timeoutsRef.current.forEach(clearTimeout)
      intervalsRef.current.forEach(clearInterval)
      timeoutsRef.current = []
      intervalsRef.current = []
    }
  }, [meshData])

  console.log('SearchAnimationDemo render:', { animationPhase, query, queryLength: query.length, highlightedNodes: highlightedNodes.size, resultNodes: resultNodes.length })

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <MemoryMesh3DContainer 
        meshData={meshData}
        highlightedNodes={highlightedNodes}
        pulseIntensity={pulseIntensity}
      />
      
      {/* Search Animation UI */}
      <div className="absolute bottom-2 left-0 right-0 z-10 px-4 pointer-events-none">
        <div className="max-w-xl mx-auto">
          {/* Search Input */}
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="text-gray-500 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 flex items-center">
                <span className="text-base font-light text-gray-900 leading-normal">{query || '\u00A0'}</span>
              </div>
              {animationPhase === 'searching' && (
                <div className="animate-spin text-gray-500 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Result Summary - positioned to not cover mesh */}
          {animationPhase === 'result' && resultNodes.length > 0 && (
            <div className="mt-2 bg-white/95 backdrop-blur-md border border-gray-300/50 rounded-lg px-3 py-2">
              <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-1.5">
                [{resultNodes.length} {resultNodes.length === 1 ? 'RESULT' : 'RESULTS'} FOUND]
              </div>
              <div className="text-xs text-gray-600 mb-2 leading-relaxed">
                Add a login API, store the returned token in httpOnly cookies, protect routes with a wrapper that checks auth state, fetch the user profile on app load, redirect to login when no valid session exists.
              </div>
              <div className="space-y-1">
                {resultNodes.map((nodeId, index) => {
                  const node = meshData.nodes.find(n => n.id === nodeId)
                  if (!node) return null
                  return (
                    <div
                      key={nodeId}
                      className="text-xs text-gray-700 leading-relaxed"
                      style={{
                        animation: `slideInUp 0.5s ease-out ${index * 0.1}s both`
                      }}
                    >
                      <span className="font-medium">• {node.title || node.label}</span>
                      <span className="text-gray-500 ml-2">[{node.type}]</span>
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

// Mock mesh data for demonstration
const mockMeshData: MemoryMesh = {
  nodes: [
    {
      id: "1",
      memory_id: "mem-1",
      type: "browser",
      label: "React Documentation",
      x: -0.3,
      y: 0.2,
      title: "React Documentation",
      importance_score: 0.8,
      hasEmbedding: true,
    },
    {
      id: "2",
      memory_id: "mem-2",
      type: "browser",
      label: "TypeScript Guide",
      x: 0.15,
      y: -0.25,
      title: "TypeScript Guide",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "3",
      memory_id: "mem-3",
      type: "extension",
      label: "GitHub Repository",
      x: 0.25,
      y: 0.05,
      title: "GitHub Repository",
      importance_score: 0.9,
      hasEmbedding: true,
    },
    {
      id: "4",
      memory_id: "mem-4",
      type: "manual",
      label: "Project Notes",
      x: -0.2,
      y: -0.15,
      title: "Project Notes",
      importance_score: 0.6,
      hasEmbedding: true,
    },
    {
      id: "5",
      memory_id: "mem-5",
      type: "browser",
      label: "API Documentation",
      x: 0.1,
      y: 0.3,
      title: "API Documentation",
      importance_score: 0.75,
      hasEmbedding: true,
    },
    {
      id: "6",
      memory_id: "mem-6",
      type: "reasoning",
      label: "Code Analysis",
      x: -0.25,
      y: -0.3,
      title: "Code Analysis",
      importance_score: 0.65,
      hasEmbedding: true,
    },
    {
      id: "7",
      memory_id: "mem-7",
      type: "browser",
      label: "Design System",
      x: 0.2,
      y: 0.15,
      title: "Design System",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "8",
      memory_id: "mem-8",
      type: "extension",
      label: "Stack Overflow",
      x: -0.15,
      y: 0.25,
      title: "Stack Overflow",
      importance_score: 0.6,
      hasEmbedding: true,
    },
    {
      id: "9",
      memory_id: "mem-9",
      type: "browser",
      label: "Tutorial Video",
      x: 0.25,
      y: -0.2,
      title: "Tutorial Video",
      importance_score: 0.55,
      hasEmbedding: true,
    },
    {
      id: "10",
      memory_id: "mem-10",
      type: "manual",
      label: "Meeting Notes",
      x: -0.05,
      y: -0.05,
      title: "Meeting Notes",
      importance_score: 0.8,
      hasEmbedding: true,
    },
    {
      id: "11",
      memory_id: "mem-11",
      type: "browser",
      label: "CSS Tricks",
      x: 0.1,
      y: 0.18,
      title: "CSS Tricks",
      importance_score: 0.65,
      hasEmbedding: true,
    },
    {
      id: "12",
      memory_id: "mem-12",
      type: "extension",
      label: "MDN Web Docs",
      x: -0.18,
      y: 0.22,
      title: "MDN Web Docs",
      importance_score: 0.85,
      hasEmbedding: true,
    },
    {
      id: "13",
      memory_id: "mem-13",
      type: "browser",
      label: "Stack Exchange",
      x: 0.22,
      y: -0.1,
      title: "Stack Exchange",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "14",
      memory_id: "mem-14",
      type: "manual",
      label: "Code Review",
      x: -0.28,
      y: 0.1,
      title: "Code Review",
      importance_score: 0.75,
      hasEmbedding: true,
    },
    {
      id: "15",
      memory_id: "mem-15",
      type: "reasoning",
      label: "Architecture Notes",
      x: 0.03,
      y: -0.22,
      title: "Architecture Notes",
      importance_score: 0.8,
      hasEmbedding: true,
    },
    {
      id: "16",
      memory_id: "mem-16",
      type: "browser",
      label: "Dev.to Article",
      x: -0.22,
      y: -0.16,
      title: "Dev.to Article",
      importance_score: 0.6,
      hasEmbedding: true,
    },
    {
      id: "17",
      memory_id: "mem-17",
      type: "extension",
      label: "NPM Package",
      x: 0.15,
      y: 0.28,
      title: "NPM Package",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "18",
      memory_id: "mem-18",
      type: "browser",
      label: "YouTube Tutorial",
      x: -0.1,
      y: 0.35,
      title: "YouTube Tutorial",
      importance_score: 0.65,
      hasEmbedding: true,
    },
    {
      id: "19",
      memory_id: "mem-19",
      type: "manual",
      label: "Design Patterns",
      x: 0.28,
      y: 0.03,
      title: "Design Patterns",
      importance_score: 0.75,
      hasEmbedding: true,
    },
    {
      id: "20",
      memory_id: "mem-20",
      type: "reasoning",
      label: "Performance Tips",
      x: -0.03,
      y: 0.1,
      title: "Performance Tips",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "21",
      memory_id: "mem-21",
      type: "browser",
      label: "Reddit Discussion",
      x: 0.1,
      y: -0.28,
      title: "Reddit Discussion",
      importance_score: 0.55,
      hasEmbedding: true,
    },
    {
      id: "22",
      memory_id: "mem-22",
      type: "extension",
      label: "CodePen Example",
      x: -0.16,
      y: -0.22,
      title: "CodePen Example",
      importance_score: 0.6,
      hasEmbedding: true,
    },
    {
      id: "23",
      memory_id: "mem-23",
      type: "browser",
      label: "Blog Post",
      x: 0.22,
      y: 0.22,
      title: "Blog Post",
      importance_score: 0.65,
      hasEmbedding: true,
    },
    {
      id: "24",
      memory_id: "mem-24",
      type: "manual",
      label: "Best Practices",
      x: -0.1,
      y: -0.1,
      title: "Best Practices",
      importance_score: 0.8,
      hasEmbedding: true,
    },
    {
      id: "25",
      memory_id: "mem-25",
      type: "reasoning",
      label: "Debugging Guide",
      x: 0.03,
      y: 0.16,
      title: "Debugging Guide",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "26",
      memory_id: "mem-26",
      type: "browser",
      label: "Tech Conference",
      x: -0.22,
      y: 0.28,
      title: "Tech Conference",
      importance_score: 0.75,
      hasEmbedding: true,
    },
    {
      id: "27",
      memory_id: "mem-27",
      type: "extension",
      label: "Library Docs",
      x: 0.16,
      y: -0.16,
      title: "Library Docs",
      importance_score: 0.65,
      hasEmbedding: true,
    },
    {
      id: "28",
      memory_id: "mem-28",
      type: "browser",
      label: "Forum Thread",
      x: -0.03,
      y: -0.28,
      title: "Forum Thread",
      importance_score: 0.6,
      hasEmbedding: true,
    },
    {
      id: "29",
      memory_id: "mem-29",
      type: "manual",
      label: "Team Notes",
      x: 0.28,
      y: 0.1,
      title: "Team Notes",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "30",
      memory_id: "mem-30",
      type: "reasoning",
      label: "Code Snippet",
      x: -0.16,
      y: 0.03,
      title: "Code Snippet",
      importance_score: 0.65,
      hasEmbedding: true,
    },
    {
      id: "31",
      memory_id: "mem-31",
      type: "browser",
      label: "Vue.js Guide",
      x: 0.12,
      y: 0.08,
      title: "Vue.js Guide",
      importance_score: 0.68,
      hasEmbedding: true,
    },
    {
      id: "32",
      memory_id: "mem-32",
      type: "extension",
      label: "Docker Docs",
      x: -0.08,
      y: 0.18,
      title: "Docker Docs",
      importance_score: 0.72,
      hasEmbedding: true,
    },
    {
      id: "33",
      memory_id: "mem-33",
      type: "browser",
      label: "Kubernetes Tutorial",
      x: 0.18,
      y: -0.12,
      title: "Kubernetes Tutorial",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "34",
      memory_id: "mem-34",
      type: "manual",
      label: "Deployment Notes",
      x: -0.12,
      y: -0.08,
      title: "Deployment Notes",
      importance_score: 0.75,
      hasEmbedding: true,
    },
    {
      id: "35",
      memory_id: "mem-35",
      type: "reasoning",
      label: "Security Best Practices",
      x: 0.08,
      y: 0.12,
      title: "Security Best Practices",
      importance_score: 0.78,
      hasEmbedding: true,
    },
    {
      id: "36",
      memory_id: "mem-36",
      type: "browser",
      label: "AWS Documentation",
      x: -0.18,
      y: -0.12,
      title: "AWS Documentation",
      importance_score: 0.73,
      hasEmbedding: true,
    },
    {
      id: "37",
      memory_id: "mem-37",
      type: "extension",
      label: "GraphQL Tutorial",
      x: 0.14,
      y: 0.22,
      title: "GraphQL Tutorial",
      importance_score: 0.67,
      hasEmbedding: true,
    },
    {
      id: "38",
      memory_id: "mem-38",
      type: "browser",
      label: "REST API Design",
      x: -0.14,
      y: 0.14,
      title: "REST API Design",
      importance_score: 0.71,
      hasEmbedding: true,
    },
    {
      id: "39",
      memory_id: "mem-39",
      type: "manual",
      label: "Database Schema",
      x: 0.06,
      y: -0.18,
      title: "Database Schema",
      importance_score: 0.69,
      hasEmbedding: true,
    },
    {
      id: "40",
      memory_id: "mem-40",
      type: "reasoning",
      label: "System Architecture",
      x: -0.06,
      y: -0.14,
      title: "System Architecture",
      importance_score: 0.76,
      hasEmbedding: true,
    },
    {
      id: "41",
      memory_id: "mem-41",
      type: "browser",
      label: "Testing Strategies",
      x: 0.16,
      y: 0.06,
      title: "Testing Strategies",
      importance_score: 0.64,
      hasEmbedding: true,
    },
    {
      id: "42",
      memory_id: "mem-42",
      type: "extension",
      label: "CI/CD Pipeline",
      x: -0.1,
      y: 0.2,
      title: "CI/CD Pipeline",
      importance_score: 0.74,
      hasEmbedding: true,
    },
    {
      id: "43",
      memory_id: "mem-43",
      type: "browser",
      label: "Microservices Guide",
      x: 0.2,
      y: -0.08,
      title: "Microservices Guide",
      importance_score: 0.72,
      hasEmbedding: true,
    },
    {
      id: "44",
      memory_id: "mem-44",
      type: "manual",
      label: "Code Standards",
      x: -0.04,
      y: -0.2,
      title: "Code Standards",
      importance_score: 0.77,
      hasEmbedding: true,
    },
    {
      id: "45",
      memory_id: "mem-45",
      type: "reasoning",
      label: "Performance Optimization",
      x: 0.04,
      y: 0.16,
      title: "Performance Optimization",
      importance_score: 0.75,
      hasEmbedding: true,
    },
    {
      id: "46",
      memory_id: "mem-46",
      type: "browser",
      label: "Webpack Config",
      x: -0.2,
      y: -0.06,
      title: "Webpack Config",
      importance_score: 0.66,
      hasEmbedding: true,
    },
    {
      id: "47",
      memory_id: "mem-47",
      type: "extension",
      label: "Vite Documentation",
      x: 0.12,
      y: 0.26,
      title: "Vite Documentation",
      importance_score: 0.68,
      hasEmbedding: true,
    },
    {
      id: "48",
      memory_id: "mem-48",
      type: "browser",
      label: "State Management",
      x: -0.16,
      y: 0.16,
      title: "State Management",
      importance_score: 0.7,
      hasEmbedding: true,
    },
    {
      id: "49",
      memory_id: "mem-49",
      type: "manual",
      label: "Component Library",
      x: 0.08,
      y: -0.22,
      title: "Component Library",
      importance_score: 0.71,
      hasEmbedding: true,
    },
    {
      id: "50",
      memory_id: "mem-50",
      type: "reasoning",
      label: "Design Tokens",
      x: -0.02,
      y: -0.16,
      title: "Design Tokens",
      importance_score: 0.73,
      hasEmbedding: true,
    },
  ],
  edges: [
    {
      source: "1",
      target: "2",
      relation_type: "similar",
      similarity_score: 0.85,
    },
    {
      source: "1",
      target: "3",
      relation_type: "related",
      similarity_score: 0.78,
    },
    {
      source: "2",
      target: "5",
      relation_type: "similar",
      similarity_score: 0.82,
    },
    {
      source: "3",
      target: "7",
      relation_type: "related",
      similarity_score: 0.76,
    },
    {
      source: "4",
      target: "6",
      relation_type: "similar",
      similarity_score: 0.79,
    },
    {
      source: "5",
      target: "7",
      relation_type: "related",
      similarity_score: 0.81,
    },
    {
      source: "8",
      target: "1",
      relation_type: "similar",
      similarity_score: 0.77,
    },
    {
      source: "9",
      target: "2",
      relation_type: "related",
      similarity_score: 0.74,
    },
    {
      source: "10",
      target: "4",
      relation_type: "similar",
      similarity_score: 0.83,
    },
    {
      source: "6",
      target: "10",
      relation_type: "related",
      similarity_score: 0.75,
    },
    {
      source: "1",
      target: "11",
      relation_type: "similar",
      similarity_score: 0.72,
    },
    {
      source: "2",
      target: "12",
      relation_type: "related",
      similarity_score: 0.78,
    },
    {
      source: "3",
      target: "13",
      relation_type: "similar",
      similarity_score: 0.76,
    },
    {
      source: "4",
      target: "14",
      relation_type: "related",
      similarity_score: 0.81,
    },
    {
      source: "5",
      target: "15",
      relation_type: "similar",
      similarity_score: 0.79,
    },
    {
      source: "7",
      target: "16",
      relation_type: "related",
      similarity_score: 0.73,
    },
    {
      source: "8",
      target: "17",
      relation_type: "similar",
      similarity_score: 0.77,
    },
    {
      source: "9",
      target: "18",
      relation_type: "related",
      similarity_score: 0.74,
    },
    {
      source: "10",
      target: "19",
      relation_type: "similar",
      similarity_score: 0.82,
    },
    {
      source: "11",
      target: "20",
      relation_type: "related",
      similarity_score: 0.75,
    },
    {
      source: "12",
      target: "21",
      relation_type: "similar",
      similarity_score: 0.71,
    },
    {
      source: "13",
      target: "22",
      relation_type: "related",
      similarity_score: 0.78,
    },
    {
      source: "14",
      target: "23",
      relation_type: "similar",
      similarity_score: 0.76,
    },
    {
      source: "15",
      target: "24",
      relation_type: "related",
      similarity_score: 0.84,
    },
    {
      source: "16",
      target: "25",
      relation_type: "similar",
      similarity_score: 0.72,
    },
    {
      source: "17",
      target: "26",
      relation_type: "related",
      similarity_score: 0.79,
    },
    {
      source: "18",
      target: "27",
      relation_type: "similar",
      similarity_score: 0.73,
    },
    {
      source: "19",
      target: "28",
      relation_type: "related",
      similarity_score: 0.77,
    },
    {
      source: "20",
      target: "29",
      relation_type: "similar",
      similarity_score: 0.75,
    },
    {
      source: "21",
      target: "30",
      relation_type: "related",
      similarity_score: 0.70,
    },
    {
      source: "1",
      target: "15",
      relation_type: "related",
      similarity_score: 0.80,
    },
    {
      source: "2",
      target: "20",
      relation_type: "similar",
      similarity_score: 0.76,
    },
    {
      source: "3",
      target: "17",
      relation_type: "related",
      similarity_score: 0.78,
    },
    {
      source: "5",
      target: "23",
      relation_type: "similar",
      similarity_score: 0.74,
    },
    {
      source: "7",
      target: "19",
      relation_type: "related",
      similarity_score: 0.81,
    },
    {
      source: "11",
      target: "13",
      relation_type: "similar",
      similarity_score: 0.73,
    },
    {
      source: "12",
      target: "18",
      relation_type: "related",
      similarity_score: 0.79,
    },
    {
      source: "14",
      target: "24",
      relation_type: "similar",
      similarity_score: 0.82,
    },
    {
      source: "15",
      target: "25",
      relation_type: "related",
      similarity_score: 0.77,
    },
    {
      source: "22",
      target: "28",
      relation_type: "similar",
      similarity_score: 0.71,
    },
    {
      source: "24",
      target: "29",
      relation_type: "related",
      similarity_score: 0.83,
    },
    {
      source: "26",
      target: "30",
      relation_type: "similar",
      similarity_score: 0.75,
    },
    {
      source: "31",
      target: "1",
      relation_type: "related",
      similarity_score: 0.76,
    },
    {
      source: "32",
      target: "33",
      relation_type: "similar",
      similarity_score: 0.82,
    },
    {
      source: "34",
      target: "36",
      relation_type: "related",
      similarity_score: 0.79,
    },
    {
      source: "35",
      target: "40",
      relation_type: "similar",
      similarity_score: 0.84,
    },
    {
      source: "37",
      target: "38",
      relation_type: "related",
      similarity_score: 0.77,
    },
    {
      source: "39",
      target: "40",
      relation_type: "similar",
      similarity_score: 0.81,
    },
    {
      source: "41",
      target: "42",
      relation_type: "related",
      similarity_score: 0.75,
    },
    {
      source: "43",
      target: "44",
      relation_type: "similar",
      similarity_score: 0.78,
    },
    {
      source: "45",
      target: "46",
      relation_type: "related",
      similarity_score: 0.73,
    },
    {
      source: "47",
      target: "48",
      relation_type: "similar",
      similarity_score: 0.76,
    },
    {
      source: "49",
      target: "50",
      relation_type: "related",
      similarity_score: 0.8,
    },
    {
      source: "31",
      target: "7",
      relation_type: "similar",
      similarity_score: 0.74,
    },
    {
      source: "32",
      target: "15",
      relation_type: "related",
      similarity_score: 0.8,
    },
    {
      source: "33",
      target: "36",
      relation_type: "similar",
      similarity_score: 0.83,
    },
    {
      source: "35",
      target: "24",
      relation_type: "related",
      similarity_score: 0.85,
    },
    {
      source: "37",
      target: "5",
      relation_type: "similar",
      similarity_score: 0.72,
    },
    {
      source: "38",
      target: "5",
      relation_type: "related",
      similarity_score: 0.78,
    },
    {
      source: "39",
      target: "15",
      relation_type: "similar",
      similarity_score: 0.77,
    },
    {
      source: "40",
      target: "15",
      relation_type: "related",
      similarity_score: 0.86,
    },
    {
      source: "42",
      target: "34",
      relation_type: "similar",
      similarity_score: 0.81,
    },
    {
      source: "43",
      target: "40",
      relation_type: "related",
      similarity_score: 0.82,
    },
    {
      source: "44",
      target: "24",
      relation_type: "similar",
      similarity_score: 0.84,
    },
    {
      source: "45",
      target: "20",
      relation_type: "related",
      similarity_score: 0.79,
    },
    {
      source: "46",
      target: "47",
      relation_type: "similar",
      similarity_score: 0.75,
    },
    {
      source: "48",
      target: "1",
      relation_type: "related",
      similarity_score: 0.77,
    },
    {
      source: "49",
      target: "7",
      relation_type: "similar",
      similarity_score: 0.8,
    },
    {
      source: "50",
      target: "7",
      relation_type: "related",
      similarity_score: 0.78,
    },
    {
      source: "11",
      target: "31",
      relation_type: "similar",
      similarity_score: 0.73,
    },
    {
      source: "12",
      target: "35",
      relation_type: "related",
      similarity_score: 0.81,
    },
    {
      source: "13",
      target: "41",
      relation_type: "similar",
      similarity_score: 0.74,
    },
    {
      source: "14",
      target: "44",
      relation_type: "related",
      similarity_score: 0.83,
    },
    {
      source: "16",
      target: "46",
      relation_type: "similar",
      similarity_score: 0.76,
    },
    {
      source: "17",
      target: "47",
      relation_type: "related",
      similarity_score: 0.79,
    },
    {
      source: "19",
      target: "49",
      relation_type: "similar",
      similarity_score: 0.82,
    },
    {
      source: "21",
      target: "13",
      relation_type: "related",
      similarity_score: 0.75,
    },
    {
      source: "22",
      target: "37",
      relation_type: "similar",
      similarity_score: 0.72,
    },
    {
      source: "23",
      target: "38",
      relation_type: "related",
      similarity_score: 0.78,
    },
    {
      source: "25",
      target: "35",
      relation_type: "similar",
      similarity_score: 0.8,
    },
    {
      source: "27",
      target: "3",
      relation_type: "related",
      similarity_score: 0.77,
    },
    {
      source: "28",
      target: "21",
      relation_type: "similar",
      similarity_score: 0.74,
    },
    {
      source: "29",
      target: "49",
      relation_type: "related",
      similarity_score: 0.81,
    },
    {
      source: "30",
      target: "25",
      relation_type: "similar",
      similarity_score: 0.76,
    },
  ],
  clusters: {},
  metadata: {
    similarity_threshold: 0.4,
    total_nodes: 50,
    nodes_in_latent_space: 50,
    total_edges: 80,
    detected_clusters: 0,
    average_connections: 3.2,
    is_latent_space: true,
    projection_method: "umap",
  },
}

// Values inlined into the component for clarity

export const Landing = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Prevent browser from restoring previous scroll position and ensure top on load
    if (typeof window !== "undefined" && typeof history !== "undefined") {
      try {
        if ("scrollRestoration" in history) {
          const historyWithScrollRestoration = history as {
            scrollRestoration?: string
          }
          historyWithScrollRestoration.scrollRestoration = "manual"
        }
      } catch {
        // Ignore errors setting scroll restoration
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }

    setIsVisible(true)
  }, [])

  return (
    <div
      className="min-h-screen text-black relative font-primary overflow-hidden"
      role="main"
      style={{
        backgroundImage: "linear-gradient(135deg, #f9fafb, #ffffff, #f3f4f6)",
        color: "#000000",
      }}
    >
      {/* Configurable gradient blur overlays */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {[
          {
            className: "absolute -top-28 -left-24 w-[28rem] h-[28rem]",
            from: "#a5b4fc",
            via: "#fbcfe8",
            to: "#fde68a",
            opacity: 0.35,
          },
          {
            className: "absolute -bottom-28 right-0 w-[28rem] h-[28rem]",
            from: "#99f6e4",
            via: "#6ee7b7",
            to: "#a7f3d0",
            opacity: 0.3,
          },
        ].map((b, i) => (
          <div
            key={i}
            className={`${b.className} rounded-full blur-3xl`}
            style={{
              backgroundImage: `linear-gradient(135deg, ${b.from}, ${b.via}, ${b.to})`,
              opacity: b.opacity as number,
              filter: "blur(64px)",
            }}
          />
        ))}
      </div>

      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
            backgroundSize: "24px 24px",
            animation: "gridMove 20s linear infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(24px, 24px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 0 8px rgba(0,0,0,0.05); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes blink {
          0%, 50% { border-color: transparent; }
          51%, 100% { border-color: currentColor; }
        }
        @keyframes drawLine {
          from { height: 0; opacity: 0; }
          to { height: 100%; opacity: 1; }
        }
        @keyframes circlePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Logo Header */}
      <header className="fixed top-0 inset-x-0 z-40 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/black-transparent.png"
              alt="Cognia"
              className="w-10 h-10"
            />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-italics font-editorial text-black">
                  Cognia
                </span>
                <span className="text-xs text-gray-600 font-mono -mt-1">
                  Remember what the web showed you
                </span>
            </div>
          </div>
        </div>
      </header>
      {/* spacer to offset fixed header height */}
      <div className="h-20 sm:h-24" aria-hidden="true" />

      {/* Hero Section */}
      <Section className="min-h-screen bg-transparent relative overflow-hidden py-16 sm:py-20 lg:py-28">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Floating geometric shapes with enhanced animations */}
          <div
            className="absolute top-20 left-10 w-6 h-6 border-2 border-gray-300/60 rounded-lg animate-pulse"
            style={{
              animation:
                "float 6s ease-in-out infinite, pulse-glow 4s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-40 right-20 w-8 h-8 border-2 border-gray-300/60 rotate-45"
            style={{
              animation:
                "float 8s ease-in-out infinite reverse, pulse-glow 3s ease-in-out infinite 1s",
            }}
          />
          <div
            className="absolute bottom-40 left-1/4 w-4 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"
            style={{
              animation:
                "float 5s ease-in-out infinite 0.5s, pulse-glow 2s ease-in-out infinite 2s",
            }}
          />
          <div
            className="absolute top-1/2 right-1/3 w-3 h-12 border-l-2 border-gray-300/60"
            style={{
              animation:
                "float 7s ease-in-out infinite 1s, pulse-glow 3s ease-in-out infinite 0.5s",
            }}
          />
          <div
            className="absolute top-1/3 left-1/3 w-5 h-5 border-2 border-gray-300/40 rounded-full"
            style={{
              animation:
                "float 9s ease-in-out infinite 2s, pulse-glow 4s ease-in-out infinite 1.5s",
            }}
          />

          {/* Enhanced grid pattern */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)
              `,
                backgroundSize: "32px 32px",
                animation: "gridMove 25s linear infinite reverse",
              }}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full flex items-center">
          <div className="w-full text-center space-y-8 sm:space-y-10 mx-auto">
            {/* Announcement */}
            <div
              className="flex justify-center"
              style={{
                animation: isVisible
                  ? "fadeInScale 0.8s ease-out 0.1s both"
                  : "none",
              }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-300/80 bg-white/80 backdrop-blur px-3 py-1 text-xs sm:text-sm text-gray-700">
                <span className="inline-flex items-center rounded-full bg-black text-white px-2 py-0.5 text-[10px] sm:text-xs uppercase tracking-wider">
                  New
                </span>
                <span className="whitespace-nowrap">
                  Instant search for anything you saw online
                </span>
                <button
                  className="underline underline-offset-2 hover:no-underline"
                  onClick={() => (window.location.href = "/docs")}
                >
                  Learn more
                </button>
              </div>
            </div>
            {/* Headline */}
            <div className="overflow-hidden">
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-light leading-tight font-editorial tracking-tight"
                style={{
                  animation: isVisible ? "slideInUp 1s ease-out" : "none",
                }}
              >
                <span className="block text-black">
                  <span className="align-baseline">A</span>{" "}
                  <span className="font-editorial italic">searchable</span>{" "}
                  <span className="align-baseline">memory</span>
                </span>
                <span
                  className="block text-3xl sm:text-4xl lg:text-5xl font-normal mt-2"
                  style={{
                    animation: isVisible
                      ? "slideInUp 1s ease-out 0.2s both"
                      : "none",
                  }}
                >
                  for everything you see
                </span>
                <span
                  className="block text-2xl sm:text-3xl lg:text-4xl font-light mt-1"
                  style={{
                    animation: isVisible
                      ? "slideInUp 1s ease-out 0.4s both"
                      : "none",
                  }}
                >
                  online
                </span>
              </h1>
            </div>

            {/* Concise value proposition */}
            <p
              className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-800 leading-relaxed font-primary font-medium"
              style={{
                animation: isVisible
                  ? "slideInUp 1s ease-out 0.6s both"
                  : "none",
              }}
            >
              Cognia is your photographic memory for the web, capturing text,
              links and context as you browse so you can find it in seconds.
            </p>

            {/* Waitlist Form and Self-Host Option */}
            <div
              className="mt-8 sm:mt-10"
              style={{
                animation: isVisible
                  ? "slideInUp 1s ease-out 0.8s both"
                  : "none",
              }}
            >
              <div className="max-w-md mx-auto space-y-4">
                <WaitlistForm compact />
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-sm text-gray-500 font-primary">or</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                <button
                  onClick={() =>
                    window.open("https://github.com/cogniahq/Cognia", "_blank")
                  }
                  className="w-full group relative overflow-hidden border border-gray-300 px-6 py-3 transition-all duration-200 hover:border-black hover:shadow-sm disabled:opacity-50 bg-white/80 backdrop-blur"
                >
                  <span className="relative z-10 text-sm font-medium text-gray-900 group-hover:text-white transition-colors duration-500 flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Self-host on GitHub
                  </span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Product Explanation Section */}
        <Section className="bg-transparent py-16 sm:py-20 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light font-editorial mb-4">
              How it works
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto">
              Cognia captures everything you see online, making it instantly
              searchable with natural language queries.
              </p>
            </div>

          <div className="w-full max-w-7xl mx-auto aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] h-[60vh] sm:h-[70vh] lg:h-[80vh] min-h-[500px] sm:min-h-[600px] relative rounded-xl overflow-hidden">
            <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
              <SearchAnimationDemo meshData={mockMeshData} />
            </div>
          </div>
          </div>
        </Section>

      {/* Data Flow Section */}
      <Section className="bg-transparent py-16 sm:py-20 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light font-editorial mb-4">
              From browsing to memory
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto">
              Your extension silently captures and organizes everything you see,
              building your searchable memory mesh in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8">
            {/* Step 1: Extension Capture */}
            <div
              className="text-center"
              style={{
                animation: isVisible
                  ? "slideInUp 0.8s ease-out 0.2s both"
                  : "none",
              }}
            >
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 border border-gray-300 rounded-full flex items-center justify-center bg-white/30 backdrop-blur-sm transition-all duration-500 hover:border-gray-400">
                  <span className="text-2xl font-light text-gray-700">1</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-light font-editorial text-black mb-3">
                Extension captures
              </h3>
              <p className="text-base text-gray-700 leading-relaxed font-primary">
                As you browse, the extension automatically captures text,
                links, and context from every page you visit.
              </p>
            </div>

            {/* Step 2: Data Aggregation */}
            <div
              className="text-center"
              style={{
                animation: isVisible
                  ? "slideInUp 0.8s ease-out 0.4s both"
                  : "none",
              }}
            >
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 border border-gray-300 rounded-full flex items-center justify-center bg-white/30 backdrop-blur-sm transition-all duration-500 hover:border-gray-400">
                  <span className="text-2xl font-light text-gray-700">2</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-light font-editorial text-black mb-3">
                Data aggregated
              </h3>
              <p className="text-base text-gray-700 leading-relaxed font-primary">
                Captured data is processed, embedded, and organized by
                relevance and context for efficient retrieval.
              </p>
            </div>

            {/* Step 3: Memory Mesh */}
            <div
              className="text-center"
              style={{
                animation: isVisible
                  ? "slideInUp 0.8s ease-out 0.6s both"
                  : "none",
              }}
            >
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 border border-gray-300 rounded-full flex items-center justify-center bg-white/30 backdrop-blur-sm transition-all duration-500 hover:border-gray-400">
                  <span className="text-2xl font-light text-gray-700">3</span>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-light font-editorial text-black mb-3">
                Added to memory mesh
              </h3>
              <p className="text-base text-gray-700 leading-relaxed font-primary">
                New memories are connected to related content, building
                an interconnected knowledge graph you can search instantly.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
            {/* Brand + Newsletter */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">
                  R
                </div>
                <div className="text-sm text-gray-800 font-medium">Cognia</div>
              </div>
              <p className="text-sm text-gray-600">
                A searchable memory for everything you see online.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() =>
                    window.open("https://github.com/cogniahq/Cognia", "_blank")
                  }
                  className="block text-sm text-gray-700 hover:underline text-left"
                >
                  GitHub
                </button>
                <button
                  onClick={() => window.open("https://x.com", "_blank")}
                  className="block text-sm text-gray-700 hover:underline text-left"
                >
                  X
                </button>
              </div>
            </div>

            {/* Columns (only existing routes) */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                Product
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/memories")}
                >
                  Memories
                </button>
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/search")}
                >
                  Search
                </button>
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/login")}
                >
                  Download
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                Resources
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/docs")}
                >
                  Docs
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-gray-600">
            <div>
              © {new Date().getFullYear()} Cognia. All rights reserved.
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                className="block hover:underline"
                onClick={() =>
                  window.open("https://github.com/cogniahq/Cognia", "_blank")
                }
              >
                GitHub
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
