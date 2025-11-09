import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Line, OrbitControls } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"

import { MemoryService } from "../services/memory.service"
import type { MemoryMesh, MemoryMeshEdge } from "../types/memory.type"
import { requireAuthToken } from "../utils/user-id.util"
import { ErrorMessage, LoadingSpinner } from "./ui/loading-spinner"

interface MemoryMesh3DProps {
  className?: string
  onNodeClick?: (memoryId: string) => void
  similarityThreshold?: number
  selectedMemoryId?: string
  highlightedMemoryIds?: string[]
  onMeshLoad?: (mesh: MemoryMesh) => void
  memorySources?: Record<string, string>
  memoryUrls?: Record<string, string>
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

  // First check if source has a specific color (source takes precedence)
  if (key && nodeColors[key]) {
    return nodeColors[key]
  }

  // Then check URL patterns for sources without specific colors
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

interface MemoryNodeProps {
  position: [number, number, number]
  memoryId: string
  color: string
  isSelected: boolean
  isHighlighted: boolean
  importance?: number
  inLatentSpace?: boolean
  onClick: (memoryId: string) => void
}

const MemoryNodeComponent: React.FC<MemoryNodeProps> = ({
  position,
  memoryId,
  color,
  isSelected,
  isHighlighted,
  importance = 0.5,
  inLatentSpace = true,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const [hovered, setHovered] = useState(false)

  // Supermemory-like tiny nodes
  const baseSize = 0.0035 + importance * 0.0015
  const size = baseSize
  const opacity = inLatentSpace ? 0.95 : 0.75

  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return
    const nodePosition = groupRef.current.position
    const distance = camera.position.distanceTo(nodePosition)
    const fovRad =
      camera instanceof THREE.PerspectiveCamera && camera.fov
        ? (camera.fov * Math.PI) / 180
        : (60 * Math.PI) / 180
    const worldPerceivedScale = Math.tan(fovRad / 2) * 2
    const dynamicScale = Math.min(
      6,
      Math.max(0.25, distance * worldPerceivedScale * 0.06)
    )
    const emphasis = isSelected ? 1.8 : isHighlighted ? 1.3 : 1.0
    const hoverBoost = hovered ? 1.15 : 1.0
    meshRef.current.scale.setScalar(dynamicScale * emphasis * hoverBoost)
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick(memoryId)
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
        <sphereGeometry args={[size, 6, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 1.0 : opacity}
          depthWrite={true}
          toneMapped={false}
        />
      </mesh>
      <mesh
        visible={false}
        onClick={(e) => {
          e.stopPropagation()
          onClick(memoryId)
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
      >
        <sphereGeometry args={[size * 3, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

const MemoryNode = memo(MemoryNodeComponent)

interface MemoryEdgeProps {
  start: [number, number, number]
  end: [number, number, number]
  similarity: number
  relationType?: string
}

const MemoryEdgeComponent: React.FC<MemoryEdgeProps> = ({
  start,
  end,
  similarity,
}) => {
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
  const opacity = similarity > 0.75 ? 0.6 : similarity > 0.5 ? 0.4 : 0.3
  const lineWidth = similarity > 0.85 ? 0.4 : similarity > 0.75 ? 0.3 : 0.2

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

const MemoryEdge = memo(MemoryEdgeComponent)

interface SceneProps {
  meshData: MemoryMesh
  selectedMemoryId?: string
  highlightedMemoryIds: string[]
  memorySources?: Record<string, string>
  memoryUrls?: Record<string, string>
  onNodeClick: (memoryId: string) => void
  isCompactView?: boolean
}

const SceneComponent: React.FC<SceneProps> = ({
  meshData,
  selectedMemoryId,
  highlightedMemoryIds,
  memorySources,
  memoryUrls,
  onNodeClick,
  isCompactView = false,
}) => {
  const { camera } = useThree()

  useEffect(() => {
    if (isCompactView) {
      camera.position.set(1.0, 1.0, 1.0)
    } else {
      camera.position.set(1.4, 1.4, 1.4)
    }
    camera.lookAt(0, 0, 0)
  }, [camera, isCompactView])

  const nodes = useMemo(() => {
    if (!meshData?.nodes?.length) return []

    const nodeCount = meshData.nodes.length
    const radius = isCompactView ? 1.0 : 1.6
    const zRadius = radius * 0.8

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity

    const positions: [number, number, number][] = new Array(nodeCount)
    const highlightedSet = new Set(highlightedMemoryIds)
    const memorySourcesMap = memorySources
      ? new Map(Object.entries(memorySources))
      : null
    const memoryUrlsMap = memoryUrls
      ? new Map(Object.entries(memoryUrls))
      : null

    for (let i = 0; i < nodeCount; i++) {
      const n = meshData.nodes[i]
      let position: [number, number, number]

      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        const x = n.x
        const y = n.y
        const z =
          "z" in n && typeof n.z === "number" && Number.isFinite(n.z)
            ? n.z
            : ((n.importance_score ?? 0.5) - 0.5) * 2 * 1000

        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)

        position = [x, y, z]
      } else {
        const rr = (isCompactView ? radius * 0.4 : radius * 0.55) + i * 0.008
        const theta = (i / Math.max(1, nodeCount)) * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        position = [
          rr * Math.sin(phi) * Math.cos(theta),
          rr * Math.sin(phi) * Math.sin(theta),
          rr * Math.cos(phi),
        ]
      }

      positions[i] = position
    }

    const spanX = Math.max(1e-6, maxX - minX)
    const spanY = Math.max(1e-6, maxY - minY)
    const spanZ = Math.max(1e-6, maxZ - minZ)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2

    const normalizedPositions: [number, number, number][] = new Array(nodeCount)
    for (let i = 0; i < nodeCount; i++) {
      const n = meshData.nodes[i]
      const pos = positions[i]

      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        const nx = ((pos[0] - centerX) / spanX) * radius * 2
        const ny = ((pos[1] - centerY) / spanY) * radius * 2
        const nz = ((pos[2] - centerZ) / spanZ) * zRadius * 2
        normalizedPositions[i] = [nx, ny, nz]
      } else {
        normalizedPositions[i] = [pos[0], pos[1], pos[2]]
      }
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

      const sourceType = memorySourcesMap?.get(n.memory_id || "")
      const url = memoryUrlsMap?.get(n.memory_id || "")
      const color = resolveNodeColor(String(sourceType || n.type), url)

      result[i] = {
        id: n.id,
        memoryId: n.memory_id || "",
        position: finalPos,
        color,
        isSelected: selectedMemoryId === n.memory_id,
        isHighlighted: highlightedSet.has(n.memory_id || ""),
        importance: n.importance_score,
        inLatentSpace: n.hasEmbedding === true,
      }
    }

    return result as Array<{
      id: string
      memoryId: string
      position: [number, number, number]
      color: string
      isSelected: boolean
      isHighlighted: boolean
      importance?: number
      inLatentSpace?: boolean
    }>
  }, [
    meshData,
    selectedMemoryId,
    highlightedMemoryIds,
    memorySources,
    memoryUrls,
    isCompactView,
  ])

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
      relationType?: string
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
          relationType: best.relation_type,
        })
      }
    })

    return result
  }, [meshData, nodes])

  const visibleData = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [] }

    const maxVisibleNodes = Infinity
    const maxVisibleEdges = Infinity

    const priorityNodes = nodes.filter((n) => n.isSelected || n.isHighlighted)
    const otherNodes = nodes.filter((n) => !n.isSelected && !n.isHighlighted)

    const visibleNodes =
      maxVisibleNodes === Infinity
        ? nodes
        : [
            ...priorityNodes,
            ...otherNodes.slice(
              0,
              Math.max(0, maxVisibleNodes - priorityNodes.length)
            ),
          ]

    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))
    const nodePosMap = new Map<string, string>()
    nodes.forEach((n) => {
      const posKey = `${n.position[0].toFixed(3)},${n.position[1].toFixed(3)},${n.position[2].toFixed(3)}`
      nodePosMap.set(posKey, n.id)
    })

    const filteredEdges = edges
      .filter((edge) => {
        const startKey = `${edge.start[0].toFixed(3)},${edge.start[1].toFixed(3)},${edge.start[2].toFixed(3)}`
        const endKey = `${edge.end[0].toFixed(3)},${edge.end[1].toFixed(3)},${edge.end[2].toFixed(3)}`
        const startId = nodePosMap.get(startKey)
        const endId = nodePosMap.get(endKey)

        return (
          (startId &&
            visibleNodeIds.has(startId) &&
            endId &&
            visibleNodeIds.has(endId)) ||
          edge.similarity >= 0.2
        )
      })
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, maxVisibleEdges === Infinity ? edges.length : maxVisibleEdges)

    return { nodes: visibleNodes, edges: filteredEdges }
  }, [nodes, edges])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 8, 6]} intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={0.2} color="#ffffff" />

      {visibleData.nodes.map((node) => (
        <MemoryNode
          key={node.id}
          position={node.position}
          memoryId={node.memoryId}
          color={node.color}
          isSelected={node.isSelected}
          isHighlighted={node.isHighlighted}
          importance={node.importance}
          inLatentSpace={node.inLatentSpace}
          onClick={onNodeClick}
        />
      ))}

      {visibleData.edges.map((edge, index) => (
        <MemoryEdge
          key={`edge-${index}-${edge.start.join(",")}-${edge.end.join(",")}`}
          start={edge.start}
          end={edge.end}
          similarity={edge.similarity}
          relationType={edge.relationType}
        />
      ))}
    </>
  )
}

const Scene = memo(SceneComponent)

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

const MemoryMesh3D: React.FC<MemoryMesh3DProps> = ({
  className = "",
  onNodeClick,
  similarityThreshold = 0.4,
  selectedMemoryId,
  highlightedMemoryIds = [],
  onMeshLoad,
  memorySources,
  memoryUrls,
}) => {
  const [meshData, setMeshData] = useState<MemoryMesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompactView, setIsCompactView] = useState(false)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  // Ensure OrbitControls target is always at (0,0,0) - the center of the mesh
  useEffect(() => {
    if (!controlsRef.current) return
    controlsRef.current.target.set(0, 0, 0)
    controlsRef.current.update()
  }, [controlsRef, meshData])

  useEffect(() => {
    const fetchMeshData = async () => {
      try {
        requireAuthToken()
        setIsLoading(true)
        setError(null)
        const data = await MemoryService.getMemoryMesh(
          Infinity,
          similarityThreshold
        )
        setMeshData(data)
        if (typeof onMeshLoad === "function") {
          onMeshLoad(data)
        }
      } catch (err) {
        setError("Failed to load memory mesh")
        console.error("Error fetching mesh data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMeshData()
  }, [similarityThreshold, onMeshLoad])

  const handleNodeClick = useCallback(
    (memoryId: string) => {
      if (onNodeClick) {
        onNodeClick(memoryId)
      }
    },
    [onNodeClick]
  )

  // Keyboard shortcut for toggling compact view
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "c" || event.key === "C") {
        setIsCompactView((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  if (isLoading) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-white border border-gray-200">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-white border border-gray-200">
          <ErrorMessage message={error} />
        </div>
      </div>
    )
  }

  if (!meshData) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-white border border-gray-200">
          <div className="text-sm font-mono text-gray-600">[NO MESH DATA]</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="w-full h-full overflow-hidden relative bg-transparent">
        <Canvas
          camera={{
            position: isCompactView ? [1.0, 1.0, 1.0] : [1.4, 1.4, 1.4],
            fov: isCompactView ? 75 : 60,
            near: 0.0001,
            far: 1000000000,
          }}
          style={{ background: "transparent" }}
          dpr={[1, 1.75]}
          onPointerMissed={() => {}}
        >
          <Scene
            meshData={meshData}
            selectedMemoryId={selectedMemoryId}
            highlightedMemoryIds={highlightedMemoryIds}
            memorySources={memorySources}
            memoryUrls={memoryUrls}
            onNodeClick={handleNodeClick}
            isCompactView={isCompactView}
          />
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            zoomToCursor={true}
            minDistance={0}
            maxDistance={Infinity}
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
          />
          <ControlsUpdater controlsRef={controlsRef} />
        </Canvas>
      </div>
    </div>
  )
}

export { MemoryMesh3D }
