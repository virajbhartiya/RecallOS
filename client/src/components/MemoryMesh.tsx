import React, { useRef, useMemo, useState, useEffect } from 'react'

interface MemoryNode {
  id: string
  type: 'manual' | 'on_chain' | 'browser' | 'reasoning'
  label: string
  x: number
  y: number
}

interface MemoryEdge {
  source: string
  target: string
}

interface MemoryMeshProps {
  className?: string
  autoRotate?: boolean
  zoomOnHover?: boolean
  expandNodeOnClick?: boolean
  particleTrailOnHover?: boolean
}

const nodeColors = {
  manual: '#4A90E2',
  on_chain: '#FFD700',
  browser: '#B266FF',
  reasoning: '#FF5C5C'
}

const Node: React.FC<{
  node: MemoryNode
  isHovered: boolean
  isActive: boolean
  onClick: () => void
  onHover: (hovered: boolean) => void
}> = ({ node, isHovered, isActive, onClick, onHover }) => {
  const [hovered, setHovered] = useState(false)
  const [pulse, setPulse] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => prev + 0.1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const color = nodeColors[node.type]
  const size = node.type === 'reasoning' ? 12 : node.type === 'on_chain' ? 10 : 8
  const scale = isActive ? 1.5 : isHovered ? 1.2 : 1
  const pulseScale = 1 + Math.sin(pulse) * 0.1

  return (
    <g>
      {/* Halo effect for active nodes */}
      {isActive && (
        <circle
          cx={node.x}
          cy={node.y}
          r={size * 1.5 * scale}
          fill="#b8b8ff"
          opacity={0.3}
        />
      )}
      
      {/* Main node */}
      <circle
        cx={node.x}
        cy={node.y}
        r={size * scale * pulseScale}
        fill={color}
        opacity={0.8}
        stroke="#000"
        strokeWidth={1}
        onClick={onClick}
        onMouseEnter={() => {
          setHovered(true)
          onHover(true)
        }}
        onMouseLeave={() => {
          setHovered(false)
          onHover(false)
        }}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Label on hover */}
      {(hovered || isActive) && (
        <text
          x={node.x}
          y={node.y - size - 5}
          textAnchor="middle"
          fontSize="10"
          fill="#000"
          fontFamily="monospace"
        >
          {node.label}
        </text>
      )}
    </g>
  )
}

const Edge: React.FC<{
  source: MemoryNode
  target: MemoryNode
  isHighlighted: boolean
}> = ({ source, target, isHighlighted }) => {
  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={isHighlighted ? "#b8b8ff" : "rgba(0,0,0,0.1)"}
      strokeWidth={isHighlighted ? 2 : 1}
      opacity={isHighlighted ? 0.8 : 0.3}
    />
  )
}

export const MemoryMesh: React.FC<MemoryMeshProps> = ({
  className = '',
  autoRotate = true,
  zoomOnHover = true,
  expandNodeOnClick = true,
  particleTrailOnHover = true
}) => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)

  // Generate sample memory nodes
  const nodes = useMemo((): MemoryNode[] => {
    const nodeTypes: Array<'manual' | 'on_chain' | 'browser' | 'reasoning'> = 
      ['manual', 'on_chain', 'browser', 'reasoning']
    
    return Array.from({ length: 30 }, (_, i) => ({
      id: `node-${i}`,
      type: nodeTypes[i % nodeTypes.length],
      label: `Memory ${i + 1}`,
      x: Math.random() * 300 + 50,
      y: Math.random() * 200 + 50
    }))
  }, [])

  // Generate sample edges
  const edges = useMemo((): MemoryEdge[] => {
    const edgeList: MemoryEdge[] = []
    for (let i = 0; i < nodes.length; i++) {
      // Connect each node to 1-3 random other nodes
      const numConnections = Math.floor(Math.random() * 3) + 1
      const connectedNodes = new Set<number>()
      
      while (connectedNodes.size < numConnections) {
        const targetIndex = Math.floor(Math.random() * nodes.length)
        if (targetIndex !== i && !connectedNodes.has(targetIndex)) {
          connectedNodes.add(targetIndex)
          edgeList.push({
            source: nodes[i].id,
            target: nodes[targetIndex].id
          })
        }
      }
    }
    return edgeList
  }, [nodes])

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate) return
    
    const interval = setInterval(() => {
      setRotation(prev => prev + 0.5)
    }, 50)
    
    return () => clearInterval(interval)
  }, [autoRotate])

  const handleNodeClick = (nodeId: string) => {
    if (expandNodeOnClick) {
      setActiveNode(activeNode === nodeId ? null : nodeId)
    }
  }

  const handleNodeHover = (nodeId: string, hovered: boolean) => {
    setHoveredNode(hovered ? nodeId : null)
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200 relative overflow-hidden">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 400 300"
          style={{ 
            background: 'transparent',
            transform: autoRotate ? `rotate(${rotation * 0.1}deg)` : 'none',
            transition: 'transform 0.1s ease-out'
          }}
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Render edges */}
          {edges.map((edge, index) => {
            const sourceNode = nodes.find(n => n.id === edge.source)
            const targetNode = nodes.find(n => n.id === edge.target)
            
            if (!sourceNode || !targetNode) return null
            
            const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target
            
            return (
              <Edge
                key={index}
                source={sourceNode}
                target={targetNode}
                isHighlighted={isHighlighted}
              />
            )
          })}
          
          {/* Render nodes */}
          {nodes.map((node) => (
            <Node
              key={node.id}
              node={node}
              isHovered={hoveredNode === node.id}
              isActive={activeNode === node.id}
              onClick={() => handleNodeClick(node.id)}
              onHover={(hovered) => handleNodeHover(node.id, hovered)}
            />
          ))}
        </svg>
        
        {/* Overlay text */}
        <div className="absolute bottom-4 left-4 text-xs font-mono text-gray-500">
          [FIG. 3] Live Memory Mesh
        </div>
      </div>
    </div>
  )
}
