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
  manual: '#2563eb',
  on_chain: '#16a34a',
  onchain: '#16a34a',
  'on-chain': '#16a34a',
  browser: '#0284c7',
  extension: '#0284c7',
  reasoning: '#d97706',
  ai: '#d97706'
} as Record<string, string>

const resolveNodeColor = (rawType?: string, url?: string): string => {
  const key = (rawType || '').toLowerCase()
  const href = (url || '').toLowerCase()
  if (href) {
    if (/github\.com|gitlab\.com|bitbucket\.org/.test(href)) return '#4f46e5'
    if (/npmjs\.com|pypi\.org|crates\.io|rubygems\.org/.test(href)) return '#db2777'
    if (/docs\.|developer\.|readthedocs|mdn\.|dev\.docs|learn\./.test(href)) return '#9333ea'
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(href)) return '#dc2626'
    if (/mail\.google\.com|gmail\.com|outlook\.live\.com/.test(href)) return '#16a34a'
  }
  return nodeColors[key] || '#374151'
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
  
  // More visible dots with better sizing
  const baseSize = 0.08 + (importance * 0.04)
  const size = isSelected ? baseSize + 0.02 : isHighlighted ? baseSize + 0.01 : baseSize
  const opacity = inLatentSpace ? 1.0 : 0.7
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.05 : 1)
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
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={true}
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

  // More visible lines with better contrast
  const opacity = 0.6 + (similarity * 0.3)
  const lineWidth = 2.5 + (similarity * 1.5)
  const color = '#64748b'

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={false}
      toneMapped={false}
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
      camera.position.set(3, 3, 3)
    } else {
      camera.position.set(5, 5, 5)
    }
    camera.lookAt(0, 0, 0)
  }, [camera, isCompactView])

  const nodes = useMemo(() => {
    if (!meshData?.nodes?.length) return []

    // Normalize backend XY coordinates into a compact cube around the origin
    const finiteNodes = meshData.nodes.filter((nn) => Number.isFinite(nn.x) && Number.isFinite(nn.y))
    const minX = finiteNodes.length ? Math.min(...finiteNodes.map((nn) => nn.x)) : 0
    const maxX = finiteNodes.length ? Math.max(...finiteNodes.map((nn) => nn.x)) : 1
    const minY = finiteNodes.length ? Math.min(...finiteNodes.map((nn) => nn.y)) : 0
    const maxY = finiteNodes.length ? Math.max(...finiteNodes.map((nn) => nn.y)) : 1
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const spanX = Math.max(1e-6, maxX - minX)
    const spanY = Math.max(1e-6, maxY - minY)
    const radius = isCompactView ? 2 : 4 // keep overall cluster tight
    const zRadius = radius * 0.35

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
        // Z from importance (centered around 0)
        const iz = ((n.importance_score ?? 0.5) - 0.5) * 2 * zRadius
        position = [nx, ny, iz]
      } else {
        // Generate 3D position using spherical coordinates
        const rr = (isCompactView ? radius * 0.6 : radius) + (i * 0.02)
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
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 8, 6]} intensity={0.5} />
      
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
          key={index}
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
        <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
          <ErrorMessage message={error} />
        </div>
      </div>
    )
  }

  if (!userAddress) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
          <div className="text-sm font-mono text-gray-600">[CONNECT WALLET TO VIEW MESH]</div>
        </div>
      </div>
    )
  }

  if (!meshData) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
          <div className="text-sm font-mono text-gray-600">[NO MESH DATA]</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="w-full h-full overflow-hidden relative bg-white">
        <Canvas
          camera={{ 
            position: isCompactView ? [3, 3, 3] : [5, 5, 5], 
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
        
        {/* Controls overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
              isCompactView 
                ? 'bg-blue-100 text-blue-800 border-blue-300' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            title="Toggle compact view (Press C)"
          >
            {isCompactView ? '[COMPACT]' : '[EXPANDED]'}
          </button>
        </div>

        {/* Help overlay */}
        <div className="absolute top-3 left-3 text-[9px] font-mono bg-white/90 border border-gray-200 px-2 py-1 shadow-sm">
          <div className="text-gray-600">
            <div>Mouse: Orbit • Scroll: Zoom • C: Toggle view</div>
          </div>
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-3 right-3 text-[10px] font-mono bg-white border border-gray-200 px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500" />
              <span className="font-medium text-gray-700 uppercase tracking-wide">[3D LATENT SPACE]</span>
            </div>
            {meshData?.metadata && (
              <div className="flex flex-col gap-0.5 text-[9px] text-gray-500 pl-3.5 font-mono">
                <div>{meshData.metadata.projection_method || 'UMAP'} • {meshData.metadata.nodes_in_latent_space || 0}/{meshData.metadata.total_nodes || 0} nodes</div>
                <div>{meshData.metadata.detected_clusters || 0} clusters • {isCompactView ? 'Compact' : 'Expanded'} 3D view</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { MemoryMesh3D }
