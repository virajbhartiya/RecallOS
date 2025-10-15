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
}

const nodeColors = {
  manual: '#4A90E2',
  on_chain: '#FFD700',
  browser: '#B266FF',
  reasoning: '#FF5C5C'
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
  highlightedMemoryIds = []
}) => {
  const [meshData, setMeshData] = useState<MemoryMesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // custom minimalist glyph node (diamond/chevron-like)
  interface GlyphNodeProps {
    data: {
      label: string
      memory_id?: string
      type: string
      color: string
      isSelected: boolean
      isHighlighted: boolean
    }
  }
  const GlyphNode: React.FC<GlyphNodeProps> = ({ data }) => {
    const isSelected = Boolean(data?.isSelected)
    const isHighlighted = Boolean(data?.isHighlighted)
    const baseSize = 6
    const size = isSelected ? 10 : isHighlighted ? 8 : baseSize
    const fill = String(data?.color || '#9ca3af')
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{
          width: size,
          height: size,
          background: fill,
          borderRadius: 9999,
          transition: 'all 120ms ease',
          boxShadow: isSelected
            ? '0 0 0 3px rgba(59,130,246,0.20), 0 1px 3px rgba(0,0,0,0.10)'
            : isHighlighted
            ? '0 0 0 2px rgba(245,158,11,0.20), 0 1px 2px rgba(0,0,0,0.08)'
            : '0 1px 2px rgba(0,0,0,0.08)'
        }} />
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
      } catch (err) {
        setError('Failed to load memory mesh')
        console.error('Error fetching mesh data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMeshData()
  }, [userAddress, similarityThreshold])

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
      const color = (nodeColors as Record<string, string>)[n.type] || '#666666'
      const isSelected = selectedMemoryId === n.memory_id
      const isHighlighted = highlightedMemoryIds.includes(n.memory_id || '')
      
      // Render as dots (no text label)
      const label = ''
      
      const hasValidPos = Number.isFinite(n.x) && Number.isFinite(n.y) && !(n.x === 0 && n.y === 0)
      const position = hasValidPos ? { x: n.x as number, y: n.y as number } : computePosition(i, meshData.nodes.length)
      
      // Minimal wrapper box; visual is inside custom node component
      const nodeStyle: React.CSSProperties = { background: 'transparent', width: 10, height: 10 }
      
      return {
        id: n.id,
        position,
        data: { label, memory_id: n.memory_id, type: n.type, color, isSelected, isHighlighted },
        type: 'glyph',
        style: nodeStyle
      }
    })
  }, [meshData, selectedMemoryId, highlightedMemoryIds])

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

      const style: React.CSSProperties = {}
      if (best.relation_type === 'topical') style.strokeDasharray = '5 5'
      if (best.relation_type === 'temporal') style.strokeDasharray = '2 2'

      result.push({
        id: `e-${key}`,
        source: best.source,
        target: best.target,
        type: 'straight',
        animated: false,
        style
      })
    })

    return result
  }, [meshData])

  const [nodes, setNodes] = useState<RFNode[]>([])
  const [edges, setEdges] = useState<RFEdge[]>([])

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
    if (memoryId && onNodeClick) onNodeClick(memoryId)
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

  if (!userAddress) {
    return (
      <div className={`w-full h-full ${className}`}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200">
          <div className="text-sm font-mono text-gray-600">[CONNECT WALLET TO VIEW MESH]</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="w-full h-full bg-gray-50 border border-gray-200 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickRF}
          defaultEdgeOptions={{ type: 'straight' }}
          connectionLineType="straight"
          nodesConnectable={false}
          elementsSelectable={false}
          nodeTypes={{ glyph: GlyphNode }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <MiniMap
            pannable
            zoomable
            style={{ background: '#f1f5f9', border: '1px solid #e5e7eb' }}
            nodeColor={(n: { data?: { type?: string; memory_id?: string } }) => {
              const t = (n?.data?.type as string) || ''
              const memoryId = n?.data?.memory_id
              
              // Check if this node is selected or highlighted
              if (selectedMemoryId === memoryId) {
                return '#3B82F6' // Blue for selected
              } else if (highlightedMemoryIds.includes(memoryId || '')) {
                return '#F59E0B' // Amber for highlighted
              }
              
              return (nodeColors as Record<string, string>)[t] || '#9ca3af'
            }}
            nodeStrokeColor="#111"
            nodeBorderRadius={9999}
          />
          <Controls showFitView showInteractive />
        </ReactFlow>
      </div>
    </div>
  )
}

export { MemoryMesh }
