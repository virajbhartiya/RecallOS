import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { MemoryService } from '../services/memoryService'
import { LoadingSpinner, ErrorMessage } from './ui/loading-spinner'
import type { MemoryMesh } from '../types/memory'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface MemoryMeshProps {
  className?: string
  userAddress?: string
  onNodeClick?: (memoryId: string) => void
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
}

type RFEdge = {
  id: string
  source: string
  target: string
  animated?: boolean
  style?: React.CSSProperties
}

type NodeChange = unknown
type EdgeChange = unknown
type Connection = { source: string; target: string }

const MemoryMesh: React.FC<MemoryMeshProps> = ({ className = '', userAddress, onNodeClick }) => {
  const [meshData, setMeshData] = useState<MemoryMesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMeshData = async () => {
      if (!userAddress) return
      setIsLoading(true)
      setError(null)
      try {
        const data = await MemoryService.getMemoryMesh(userAddress, 50)
        setMeshData(data)
      } catch (err) {
        setError('Failed to load memory mesh')
        console.error('Error fetching mesh data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMeshData()
  }, [userAddress])

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
      const label = (n.label || n.title || n.type || 'Node').slice(0, 24)
      const hasValidPos = Number.isFinite(n.x) && Number.isFinite(n.y) && !(n.x === 0 && n.y === 0)
      const position = hasValidPos ? { x: n.x as number, y: n.y as number } : computePosition(i, meshData.nodes.length)
      return {
        id: n.id,
        position,
        data: { label, memory_id: n.memory_id, type: n.type },
        style: {
          background: color,
          color: '#fff',
          border: '1px solid #111',
          width: 160,
          height: 36,
          fontSize: 11,
          padding: 6,
          borderRadius: 6
        }
      }
    })
  }, [meshData])

  const rfEdges: RFEdge[] = useMemo(() => {
    if (!meshData?.edges?.length) return []
    return meshData.edges.map((e, idx) => {
      const style: React.CSSProperties = {}
      if (e.relation_type === 'topical') style.strokeDasharray = '5 5'
      if (e.relation_type === 'temporal') style.strokeDasharray = '2 2'
      return {
        id: `e-${e.source}-${e.target}-${idx}`,
        source: e.source,
        target: e.target,
        animated: false,
        style
      }
    })
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
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls showFitView showInteractive />
        </ReactFlow>
      </div>
    </div>
  )
}

export { MemoryMesh }
