import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { MemoryService } from '../services/memoryService'
import { LoadingSpinner, ErrorMessage } from './ui/loading-spinner'
import type { MemoryMesh, MemoryMeshEdge } from '../types/memory'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface MemoryMeshProps {
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
  manual: '#4A90E2',
  browser: '#0ea5e9',
  extension: '#0ea5e9',
  reasoning: '#f59e0b',
  ai: '#f59e0b'
} as Record<string, string>

const resolveNodeColor = (rawType?: string, url?: string): string => {
  const key = (rawType || '').toLowerCase()
  // URL-based overrides (content-type aware)
  const href = (url || '').toLowerCase()
  if (href) {
    // code repos / dev hosts
    if (/github\.com|gitlab\.com|bitbucket\.org/.test(href)) return '#6366f1' // indigo for code repos
    if (/npmjs\.com|pypi\.org|crates\.io|rubygems\.org/.test(href)) return '#ec4899' // pink for registries
    if (/docs\.|developer\.|readthedocs|mdn\.|dev\.docs|learn\./.test(href)) return '#a855f7' // purple for docs
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(href)) return '#ef4444' // red for media
    if (/mail\.google\.com|gmail\.com|outlook\.live\.com/.test(href)) return '#22c55e' // green for mail
  }
  return nodeColors[key] || '#6b7280'
}

type NodeData = {
  label: string
  memory_id?: string
  type: string
}

// Minimal local type shapes to avoid depending on external type declarations
type RFNode = {
  id: string
  position: { x: number; y: number }
  data?: NodeData
  style?: React.CSSProperties
  sourcePosition?: unknown
  targetPosition?: unknown
  type?: string
}

type RFEdge = {
  id: string
  source: string
  target: string
  animated?: boolean
  style?: React.CSSProperties
  type?: string
}

type NodeChange = unknown
type EdgeChange = unknown
type Connection = { source: string; target: string }

const MemoryMesh: React.FC<MemoryMeshProps> = ({ 
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
  const [zoom, setZoom] = useState<number>(1)
  const [isMobile, setIsMobile] = useState<boolean>(false)

  // Latent space node with glow effects
  interface GlyphNodeProps {
    data: {
      label: string
      memory_id?: string
      type: string
      color: string
      isSelected: boolean
      isHighlighted: boolean
      importance?: number
      inLatentSpace?: boolean
      clusterId?: number
    }
  }
  const GlyphNode: React.FC<GlyphNodeProps> = ({ data }) => {
    const isSelected = Boolean(data?.isSelected)
    const isHighlighted = Boolean(data?.isHighlighted)
    const inLatentSpace = Boolean(data?.inLatentSpace)
    const importance = typeof data?.importance === 'number' ? Math.max(0, Math.min(1, data.importance)) : 0.5
    const baseSize = 6 + Math.round(importance * 6)
    const size = isSelected ? baseSize + 8 : isHighlighted ? baseSize + 2 : baseSize
    const fill = String(data?.color || '#9ca3af')
    
    // Debug logging for selected node
    if (isSelected) {
    }
    
    // Reduce opacity for nodes not in latent space
    const opacity = inLatentSpace ? 1 : 0.3
    
    
    return (
      <div style={{ position: 'relative', width: size + 6, height: size + 6 }}>
        {/* Main node - clean and minimal */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: size,
            height: size,
            background: fill,
            borderRadius: '50%',
          border: isSelected ? `3px solid ${fill}` : `1px solid ${fill}dd`,
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isSelected 
            ? `0 0 0 6px ${fill}44, 0 0 20px ${fill}66, 0 2px 4px rgba(0,0,0,0.2)`
            : isHighlighted 
            ? `0 0 0 2px ${fill}22, 0 1px 2px rgba(0,0,0,0.05)`
            : '0 1px 2px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            opacity: opacity,
            animation: isSelected ? 'pulse 0.6s ease-in-out' : 'none'
          }} 
        />
        
        <Handle
          type="target"
          position={Position.Top}
          style={{ opacity: 0, width: 0, height: 0, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ opacity: 0, width: 0, height: 0, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>
    )
  }

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

  // Track viewport size to simplify UI on mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // simple radial layout to avoid overlapping when no positions are provided
  const computePosition = (index: number, total: number) => {
    const radius = 160 + Math.min(280, total * 24)
    const angle = (index / Math.max(1, total)) * Math.PI * 2
    const cx = 400
    const cy = 250
    // tiny jitter to avoid exact collisions
    const jitterX = Math.sin(index * 17.23) * 8
    const jitterY = Math.cos(index * 11.37) * 8
    return {
      x: Math.round(cx + radius * Math.cos(angle) + jitterX),
      y: Math.round(cy + radius * Math.sin(angle) + jitterY)
    }
  }

  const rfNodes: RFNode[] = useMemo(() => {
    if (!meshData?.nodes?.length) return []
    return meshData.nodes.map((n, i) => {
      const sourceType = memorySources && n.memory_id ? memorySources[n.memory_id] : undefined
      const url = memoryUrls && n.memory_id ? memoryUrls[n.memory_id] : undefined
      const color = resolveNodeColor(String(sourceType || n.type), url)
      const isSelected = selectedMemoryId === n.memory_id
      const isHighlighted = highlightedMemoryIds.includes(n.memory_id || '')
      
      // Debug logging for selected node
      if (isSelected) {
      }
      
      // Check if node is in latent space (has embedding)
      const inLatentSpace = n.hasEmbedding === true
      
      // Render as dots (no text label)
      const label = ''
      
      const hasValidPos = Number.isFinite(n.x) && Number.isFinite(n.y) && !(n.x === 0 && n.y === 0)
      const position = hasValidPos ? { x: n.x as number, y: n.y as number } : computePosition(i, meshData.nodes.length)
      
      // Minimal wrapper box; visual is inside custom node component
      const nodeStyle: React.CSSProperties = { background: 'transparent', width: 10, height: 10 }
      
      return {
        id: n.id,
        position,
        data: { 
          label, 
          memory_id: n.memory_id, 
          type: n.type, 
          color, 
          isSelected, 
          isHighlighted, 
          importance: typeof n.importance_score === 'number' ? n.importance_score : undefined,
          inLatentSpace,
          clusterId: n.clusterId
        },
        type: 'glyph',
        style: nodeStyle
      }
    })
  }, [meshData, selectedMemoryId, highlightedMemoryIds, memorySources, memoryUrls])

  const rfEdges: RFEdge[] = useMemo(() => {
    if (!meshData?.edges?.length) return []

    // Backend already filters by similarity threshold, so we just need to deduplicate
    // Group edges by unordered node pair to avoid duplicates A->B and B->A
    const groups = new Map<string, MemoryMeshEdge[]>()
    meshData.edges.forEach((e: MemoryMeshEdge) => {
      if (e.source === e.target) return // skip self loops
      const [a, b] = e.source < e.target ? [e.source, e.target] : [e.target, e.source]
      const key = `${a}__${b}`
      const list = groups.get(key) || ([] as MemoryMeshEdge[])
      list.push(e)
      groups.set(key, list)
    })

    const result: RFEdge[] = []
    groups.forEach((edgesForPair: MemoryMeshEdge[], key) => {
      // pick the edge with highest similarity score or the first if undefined
      const best = edgesForPair.reduce<MemoryMeshEdge | undefined>((prev, curr) => {
        if (prev == null) return curr
        const ps = typeof prev.similarity_score === 'number' ? prev.similarity_score : -Infinity
        const cs = typeof curr.similarity_score === 'number' ? curr.similarity_score : -Infinity
        return cs > ps ? curr : prev
      }, edgesForPair[0]) as MemoryMeshEdge

      // Clean edge styling based on similarity
      const similarity = best.similarity_score || 0.5
      const opacity = 0.15 + (similarity * 0.25)
      const strokeWidth = 1 + (similarity * 1.5)
      
      const style: React.CSSProperties = {
        stroke: '#9ca3af',
        strokeWidth: strokeWidth,
        opacity: opacity,
        transition: 'all 0.3s ease'
      }
      
      // Subtle color variations
      if (best.relation_type === 'topical') {
        style.stroke = '#3b82f6'
      } else if (best.relation_type === 'temporal') {
        style.stroke = '#10b981'
      } else if (best.relation_type === 'semantic') {
        style.stroke = '#6366f1'
      }

      result.push({
        id: `e-${key}`,
        source: best.source,
        target: best.target,
        type: 'smoothstep',
        animated: similarity > 0.8,
        style
      })
    })

    return result
  }, [meshData])

  const [nodes, setNodes] = useState<RFNode[]>([])
  const [edges, setEdges] = useState<RFEdge[]>([])

  // Memoize nodeTypes to prevent React Flow warning
  const nodeTypes = useMemo(() => ({ glyph: GlyphNode }), [])

  useEffect(() => {
    setNodes(rfNodes)
    setEdges(rfEdges)
  }, [rfNodes, rfEdges])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds))
  }, [])

  const onNodeClickRF = useCallback((_e: unknown, node: RFNode) => {
    const memoryId = node.data?.memory_id
    if (memoryId && onNodeClick) {
      onNodeClick(memoryId)
    }
  }, [onNodeClick])

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

  const noUserContent = (
    <div className={`w-full h-full ${className}`}>
      <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
        <div className="text-sm font-mono text-gray-600">[CONNECT WALLET TO VIEW MESH]</div>
      </div>
    </div>
  )
  
  if (!userAddress) {
    return noUserContent
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="w-full h-full overflow-hidden relative bg-white">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickRF}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          connectionLineType="smoothstep"
          nodesConnectable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: isMobile ? 0.15 : 0.25 }}
          onMove={(_e: unknown, viewport: { x: number; y: number; zoom: number }) => {
            if (viewport && typeof viewport.zoom === 'number') setZoom(viewport.zoom)
          }}
          style={{
            background: 'transparent'
          }}
        >
          <Background
            variant="dots"
            color="#e5e7eb"
            gap={isMobile ? 20 : 24}
            size={1}
          />
          {!isMobile && (
            <MiniMap
              pannable
              zoomable
              style={{ 
                background: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}
              nodeColor={(n: { data?: { type?: string; memory_id?: string } }) => {
                const t = (n?.data?.type as string) || ''
                const memoryId = n?.data?.memory_id
                if (selectedMemoryId === memoryId) {
                  return '#3b82f6'
                } else if (highlightedMemoryIds.includes(memoryId || '')) {
                  return '#60a5fa'
                }
                const url = memoryId && memoryUrls ? memoryUrls[memoryId] : undefined
                return resolveNodeColor(t, url)
              }}
              nodeStrokeColor="#d1d5db"
              nodeBorderRadius={9999}
              maskColor="rgba(0, 0, 0, 0.05)"
            />
          )}
          {!isMobile && (
            <Controls 
              showFitView 
              showInteractive
            />
          )}
        </ReactFlow>
        
        {/* Info overlay */}
        <div className="absolute bottom-3 right-3 text-[10px] font-mono bg-white border border-gray-200 px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500" />
              <span className="font-medium text-gray-700 uppercase tracking-wide">[LATENT SPACE]</span>
            </div>
            {meshData?.metadata && (
              <div className="flex flex-col gap-0.5 text-[9px] text-gray-500 pl-3.5 font-mono">
                <div>{meshData.metadata.projection_method || 'UMAP'} • {meshData.metadata.nodes_in_latent_space || 0}/{meshData.metadata.total_nodes || 0} nodes</div>
                <div>{meshData.metadata.detected_clusters || 0} clusters • {Math.round(zoom * 100)}% zoom</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { MemoryMesh }
