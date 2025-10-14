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
  Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface MemoryMeshProps {
  className?: string
  userAddress?: string
  onNodeClick?: (memoryId: string) => void
  similarityThreshold?: number
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

const MemoryMesh: React.FC<MemoryMeshProps> = ({ className = '', userAddress, onNodeClick, similarityThreshold = 0.3 }) => {
  const [meshData, setMeshData] = useState<MemoryMesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      
      // Create more useful labels based on available data
      let label = ''
      if (n.title && n.title.length > 0) {
        // Use first 2-3 words of title, truncated
        const words = n.title.split(' ').slice(0, 2)
        label = words.join(' ').substring(0, 8)
      } else if (n.summary && n.summary.length > 0) {
        // Use first 2-3 words of summary, truncated
        const words = n.summary.split(' ').slice(0, 2)
        label = words.join(' ').substring(0, 8)
      } else if (n.type) {
        // Use type abbreviation
        const typeMap: Record<string, string> = {
          'manual': 'M',
          'on_chain': 'C',
          'browser': 'B',
          'reasoning': 'R'
        }
        label = typeMap[n.type] || n.type.charAt(0).toUpperCase()
      } else {
        label = 'M'
      }
      
      const hasValidPos = Number.isFinite(n.x) && Number.isFinite(n.y) && !(n.x === 0 && n.y === 0)
      const position = hasValidPos ? { x: n.x as number, y: n.y as number } : computePosition(i, meshData.nodes.length)
      return {
        id: n.id,
        position,
        data: { label, memory_id: n.memory_id, type: n.type },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: '#fff',
          color: '#111',
          border: `2px solid ${color}`,
          width: Math.max(28, label.length * 6 + 8),
          height: 28,
          fontSize: 9,
          lineHeight: '24px',
          padding: '0 4px',
          borderRadius: 9999,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }
      }
    })
  }, [meshData])

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
        // Use curved bezier edges for rounded connections
        // local minimal typing
        type: 'default',
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
          // Use bezier edges (rounded)
          defaultEdgeOptions={{ type: 'default' }}
          connectionLineType="bezier"
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <MiniMap
            pannable
            zoomable
            style={{ background: '#f1f5f9', border: '1px solid #e5e7eb' }}
            nodeColor={(n: { data?: { type?: string } }) => {
              const t = (n?.data?.type as string) || ''
              return (nodeColors as Record<string, string>)[t] || '#9ca3af'
            }}
            nodeStrokeColor="#111"
            nodeBorderRadius={6}
          />
          <Controls showFitView showInteractive />
        </ReactFlow>
      </div>
    </div>
  )
}

export { MemoryMesh }
