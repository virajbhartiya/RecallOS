import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import { MemoryService } from '../services/memoryService'
import { LoadingSpinner, ErrorMessage } from './ui/loading-spinner'
import type { MemoryMesh, MemoryMeshEdge } from '../types/memory'
import * as THREE from 'three'

interface MemoryMesh3DProps {
  className?: string
  userAddress?: string
  onNodeClick?: (memoryId: string) => void
  similarityThreshold?: number
  selectedMemoryId?: string
  highlightedMemoryIds?: string[]
  onMeshLoad?: (mesh: MemoryMesh) => void
  memorySources?: Record<string, string>
  memoryUrls?: Record<string, string>
}

const nodeColors = {
  manual: '#22c55e',
  browser: '#3b82f6',
  extension: '#3b82f6',
  reasoning: '#a855f7',
  ai: '#a855f7'
} as Record<string, string>

const resolveNodeColor = (rawType?: string, url?: string): string => {
  const key = (rawType || '').toLowerCase()
  const href = (url || '').toLowerCase()
  
  // First check if source has a specific color (source takes precedence)
  if (key && nodeColors[key]) {
    return nodeColors[key]
  }
  
  // Then check URL patterns for sources without specific colors
  if (href) {
    if (/github\.com|gitlab\.com|bitbucket\.org/.test(href)) return '#3b82f6'
    if (/npmjs\.com|pypi\.org|crates\.io|rubygems\.org/.test(href)) return '#22c55e'
    if (/docs\.|developer\.|readthedocs|mdn\.|dev\.docs|learn\./.test(href)) return '#22c55e'
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(href)) return '#3b82f6'
    if (/mail\.google\.com|gmail\.com|outlook\.live\.com/.test(href)) return '#22c55e'
  }
  
  return nodeColors[key] || '#6b7280'
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

const MemoryNode: React.FC<MemoryNodeProps> = ({
  position,
  memoryId,
  color,
  isSelected,
  isHighlighted,
  importance = 0.5,
  inLatentSpace = true,
  onClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Supermemory-like tiny nodes
  const baseSize = 0.006 + (importance * 0.003)
  const size = isSelected ? baseSize + 0.01 : isHighlighted ? baseSize + 0.004 : baseSize
  const opacity = inLatentSpace ? 0.95 : 0.75
  
  useFrame(() => {
    if (meshRef.current) {
      // Enhanced hover effect for selected nodes
      const hoverScale = isSelected ? 1.5 : isHighlighted ? 1.3 : 1.2
      meshRef.current.scale.setScalar(hovered ? hoverScale : 1)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={() => onClick(memoryId)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={isSelected ? 1.0 : opacity}
        depthWrite={true}
        toneMapped={false}
      />
    </mesh>
  )
}

interface MemoryEdgeProps {
  start: [number, number, number]
  end: [number, number, number]
  similarity: number
  relationType?: string
}

const MemoryEdge: React.FC<MemoryEdgeProps> = ({ start, end, similarity }) => {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end])

  const getLineColor = (similarity: number) => {
    if (similarity > 0.85) return '#3b82f6'
    if (similarity > 0.75) return '#38bdf8'
    return '#9ca3af'
  }

  const color = getLineColor(similarity)
  const opacity = similarity > 0.75 ? 0.6 : (similarity > 0.5 ? 0.4 : 0.3)
  const lineWidth = similarity > 0.85 ? 1 : (similarity > 0.75 ? 0.75 : 0.5)

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

interface SceneProps {
  meshData: MemoryMesh
  selectedMemoryId?: string
  highlightedMemoryIds: string[]
  memorySources?: Record<string, string>
  memoryUrls?: Record<string, string>
  onNodeClick: (memoryId: string) => void
  isCompactView?: boolean
}

const Scene: React.FC<SceneProps> = ({
  meshData,
  selectedMemoryId,
  highlightedMemoryIds,
  memorySources,
  memoryUrls,
  onNodeClick,
  isCompactView = false
}) => {
  const { camera } = useThree()
  
  useEffect(() => {
    if (isCompactView) {
      camera.position.set(2, 2, 2) // Closer to the tighter cluster
    } else {
      camera.position.set(3.5, 3.5, 3.5) // Closer to the tighter cluster
    }
    camera.lookAt(0, 0, 0)
  }, [camera, isCompactView])

  const nodes = useMemo(() => {
    if (!meshData?.nodes?.length) return []

    // Normalize backend XYZ coordinates into a compact cube around the origin
    const finiteNodes = meshData.nodes.filter((nn) => Number.isFinite(nn.x) && Number.isFinite(nn.y))
    const minX = finiteNodes.length ? Math.min(...finiteNodes.map((nn) => nn.x)) : 0
    const maxX = finiteNodes.length ? Math.max(...finiteNodes.map((nn) => nn.x)) : 1
    const minY = finiteNodes.length ? Math.min(...finiteNodes.map((nn) => nn.y)) : 0
    const maxY = finiteNodes.length ? Math.max(...finiteNodes.map((nn) => nn.y)) : 1
    const finiteZ = meshData.nodes.filter((nn: any) => Number.isFinite((nn as any).z)) as Array<any>
    const minZ = finiteZ.length ? Math.min(...finiteZ.map((nn: any) => (nn as any).z)) : 0
    const maxZ = finiteZ.length ? Math.max(...finiteZ.map((nn: any) => (nn as any).z)) : 1
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const cz = (minZ + maxZ) / 2
    const spanX = Math.max(1e-6, maxX - minX)
    const spanY = Math.max(1e-6, maxY - minY)
    const spanZ = Math.max(1e-6, maxZ - minZ)
    const radius = isCompactView ? 1.2 : 2.5 // significantly reduce spacing
    const zRadius = radius * 0.8

    return meshData.nodes.map((n, i) => {
      const sourceType = memorySources && n.memory_id ? memorySources[n.memory_id] : undefined
      const url = memoryUrls && n.memory_id ? memoryUrls[n.memory_id] : undefined
      const color = resolveNodeColor(String(sourceType || n.type), url)
      const isSelected = selectedMemoryId === n.memory_id
      const isHighlighted = highlightedMemoryIds.includes(n.memory_id || '')
      const inLatentSpace = n.hasEmbedding === true
      
      // Use 3D coordinates if available, otherwise generate them
      let position: [number, number, number]
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        // Normalize XY into [-radius, radius]
        const nx = ((n.x - cx) / spanX) * radius * 2
        const ny = ((n.y - cy) / spanY) * radius * 2
        // Prefer backend Z if present; fallback to importance
        let iz: number
        if (Number.isFinite((n as any).z)) {
          iz = (((n as any).z - cz) / spanZ) * zRadius * 2
        } else {
          iz = ((n.importance_score ?? 0.5) - 0.5) * 2 * zRadius
        }
        position = [nx, ny, iz]
      } else {
        // Generate 3D position using spherical coordinates with tighter clustering
        const rr = (isCompactView ? radius * 0.4 : radius * 0.6) + (i * 0.01) // Much tighter clustering
        const theta = (i / Math.max(1, meshData.nodes.length)) * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        position = [
          rr * Math.sin(phi) * Math.cos(theta),
          rr * Math.sin(phi) * Math.sin(theta),
          rr * Math.cos(phi)
        ]
      }
      
      return {
        id: n.id,
        memoryId: n.memory_id || '',
        position,
        color,
        isSelected,
        isHighlighted,
        importance: n.importance_score,
        inLatentSpace
      }
    })
  }, [meshData, selectedMemoryId, highlightedMemoryIds, memorySources, memoryUrls])

  const edges = useMemo(() => {
    if (!meshData?.edges?.length) return []
    
    const groups = new Map<string, MemoryMeshEdge[]>()
    meshData.edges.forEach((e: MemoryMeshEdge) => {
      if (e.source === e.target) return
      const [a, b] = e.source < e.target ? [e.source, e.target] : [e.target, e.source]
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
      const best = edgesForPair.reduce<MemoryMeshEdge | undefined>((prev, curr) => {
        if (prev == null) return curr
        const ps = typeof prev.similarity_score === 'number' ? prev.similarity_score : -Infinity
        const cs = typeof curr.similarity_score === 'number' ? curr.similarity_score : -Infinity
        return cs > ps ? curr : prev
      }, edgesForPair[0]) as MemoryMeshEdge

      const sourceNode = nodes.find(n => n.id === best.source)
      const targetNode = nodes.find(n => n.id === best.target)
      
      if (sourceNode && targetNode) {
        result.push({
          start: sourceNode.position,
          end: targetNode.position,
          similarity: best.similarity_score || 0.5,
          relationType: best.relation_type
        })
      }
    })

    return result
  }, [meshData, nodes])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 8, 6]} intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={0.2} color="#ffffff" />
      
      {nodes.map((node) => (
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
      
      {edges.map((edge, index) => (
        <MemoryEdge
          key={`edge-${index}-${edge.start.join(',')}-${edge.end.join(',')}`}
          start={edge.start}
          end={edge.end}
          similarity={edge.similarity}
          relationType={edge.relationType}
        />
      ))}
    </>
  )
}

const MemoryMesh3D: React.FC<MemoryMesh3DProps> = ({ 
  className = '', 
  userAddress, 
  onNodeClick, 
  similarityThreshold = 0.4,
  selectedMemoryId,
  highlightedMemoryIds = [],
  onMeshLoad,
  memorySources,
  memoryUrls
}) => {
  const [meshData, setMeshData] = useState<MemoryMesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompactView, setIsCompactView] = useState(false)

  useEffect(() => {
    const fetchMeshData = async () => {
      if (!userAddress) return
      setIsLoading(true)
      setError(null)
      try {
        const data = await MemoryService.getMemoryMesh(userAddress, 50, similarityThreshold)
        setMeshData(data)
        if (typeof onMeshLoad === 'function') {
          onMeshLoad(data)
        }
      } catch (err) {
        setError('Failed to load memory mesh')
        console.error('Error fetching mesh data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMeshData()
  }, [userAddress, similarityThreshold, onMeshLoad])


  const handleNodeClick = useCallback((memoryId: string) => {
    if (onNodeClick) {
      onNodeClick(memoryId)
    }
  }, [onNodeClick])

  // Keyboard shortcut for toggling compact view
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'c' || event.key === 'C') {
        setIsCompactView(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
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

  if (!userAddress) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-white border border-gray-200">
          <div className="text-sm font-mono text-gray-600">[CONNECT WALLET TO VIEW MESH]</div>
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
            position: isCompactView ? [2, 2, 2] : [3.5, 3.5, 3.5], 
            fov: isCompactView ? 75 : 60 
          }}
          style={{ background: 'transparent' }}
          dpr={[1, 1.75]} // keep crisp but not noisy
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
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={isCompactView ? 0.5 : 1}
            maxDistance={isCompactView ? 25 : 50}
            zoomSpeed={1.2}
            panSpeed={0.8}
            rotateSpeed={0.5}
          />
        </Canvas>

      </div>
    </div>
  )
}

export { MemoryMesh3D }
