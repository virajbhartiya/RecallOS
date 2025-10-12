import React, { useMemo, useState, useEffect } from 'react'
import { MemoryService } from '../services/memoryService'
import { LoadingSpinner, ErrorMessage } from './ui/loading-spinner'
import type { MemoryMeshNode, MemoryMesh } from '../types/memory'

interface MemoryMeshProps {
  className?: string
  autoRotate?: boolean
  zoomOnHover?: boolean
  expandNodeOnClick?: boolean
  particleTrailOnHover?: boolean
  userAddress?: string
  onNodeClick?: (memoryId: string) => void
}

const nodeColors = {
  manual: '#4A90E2',
  on_chain: '#FFD700',
  browser: '#B266FF',
  reasoning: '#FF5C5C'
}

const Node: React.FC<{
  node: MemoryMeshNode
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

  const color = nodeColors[node.type] || '#666666'
  const baseSize = Math.max(6, Math.min(16, 8 + (node.importance_score || 0) * 8))
  const scale = isActive ? 1.5 : isHovered ? 1.2 : 1
  const pulseScale = 1 + Math.sin(pulse) * 0.05
  const finalSize = baseSize * scale * pulseScale

  return (
    <g>
      {/* Halo effect for active nodes */}
      {isActive && (
        <circle
          cx={node.x}
          cy={node.y}
          r={finalSize * 1.8}
          fill="#b8b8ff"
          opacity={0.2}
        />
      )}
      
      {/* Connection indicator for nodes with relationships */}
      {node.importance_score && node.importance_score > 0 && (
        <circle
          cx={node.x}
          cy={node.y}
          r={finalSize + 2}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.3}
        />
      )}
      
      {/* Main node */}
      <circle
        cx={node.x}
        cy={node.y}
        r={finalSize}
        fill={color}
        opacity={0.9}
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
        data-node-id={node.id}
        className="memory-node"
      />
      
      {/* Type indicator */}
      <text
        x={node.x}
        y={node.y + 3}
        textAnchor="middle"
        fontSize="8"
        fill="#fff"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {node.type.charAt(0).toUpperCase()}
      </text>
      
       {/* Label on hover */}
       {(hovered || isActive) && (
         <g>
           <rect
             x={node.x - 80}
             y={node.y - finalSize - (isActive ? 85 : 45)}
             width={160}
             height={isActive ? 80 : 40}
             fill="rgba(0,0,0,0.9)"
             rx={4}
             stroke="rgba(255,255,255,0.2)"
             strokeWidth={1}
           />
           <text
             x={node.x}
             y={node.y - finalSize - (isActive ? 70 : 30)}
             textAnchor="middle"
             fontSize="9"
             fill="#fff"
             fontFamily="monospace"
             fontWeight="bold"
           >
             {node.label}
           </text>
           
           {/* Show more details when active (clicked) */}
           {isActive && (
             <>
               {node.title && (
                 <text
                   x={node.x}
                   y={node.y - finalSize - 55}
                   textAnchor="middle"
                   fontSize="7"
                   fill="#e0e0e0"
                   fontFamily="monospace"
                 >
                   {node.title.length > 25 ? node.title.slice(0, 25) + '...' : node.title}
                 </text>
               )}
               {node.importance_score && (
                 <text
                   x={node.x}
                   y={node.y - finalSize - 40}
                   textAnchor="middle"
                   fontSize="7"
                   fill="#4ade80"
                   fontFamily="monospace"
                 >
                   Importance: {Math.round(node.importance_score * 100)}%
                 </text>
               )}
               {node.summary && (
                 <foreignObject
                   x={node.x - 75}
                   y={node.y - finalSize - 35}
                   width={150}
                   height={30}
                 >
                   <div className="text-xs text-gray-300 font-mono leading-tight overflow-hidden">
                     {node.summary.length > 120 ? node.summary.slice(0, 120) + '...' : node.summary}
                   </div>
                 </foreignObject>
               )}
             </>
           )}
           
           {/* Blockchain info */}
           {node.tx_hash && (
             <text
               x={node.x}
               y={node.y - finalSize - (isActive ? 25 : 15)}
               textAnchor="middle"
               fontSize="7"
               fill="#60a5fa"
               fontFamily="monospace"
             >
               {node.blockchain_network || 'ETH'}: {node.tx_hash.slice(0, 8)}...
             </text>
           )}
           {node.block_number && (
             <text
               x={node.x}
               y={node.y - finalSize - (isActive ? 15 : 5)}
               textAnchor="middle"
               fontSize="7"
               fill="#fbbf24"
               fontFamily="monospace"
             >
               Block: {node.block_number}
             </text>
           )}
           
           {/* Status indicator when active */}
           {isActive && node.tx_status && (
             <text
               x={node.x}
               y={node.y - finalSize - 5}
               textAnchor="middle"
               fontSize="7"
               fill={node.tx_status === 'confirmed' ? '#4ade80' : 
                     node.tx_status === 'pending' ? '#fbbf24' : '#f87171'}
               fontFamily="monospace"
               fontWeight="bold"
             >
               {node.tx_status.toUpperCase()}
             </text>
           )}
         </g>
       )}
    </g>
  )
}

const Edge: React.FC<{
  source: MemoryMeshNode
  target: MemoryMeshNode
  isHighlighted: boolean
  relationType?: string
  similarityScore?: number
}> = ({ source, target, isHighlighted, relationType, similarityScore }) => {
  const getEdgeColor = (type?: string) => {
    switch (type) {
      case 'semantic': return '#4A90E2'
      case 'topical': return '#FFD700'
      case 'temporal': return '#FF5C5C'
      default: return '#666666'
    }
  }

  const getEdgeStyle = (type?: string) => {
    switch (type) {
      case 'semantic': return 'solid'
      case 'topical': return 'dashed'
      case 'temporal': return 'dotted'
      default: return 'solid'
    }
  }

  const color = getEdgeColor(relationType)
  const strokeDasharray = getEdgeStyle(relationType) === 'dashed' ? '5,5' : 
                         getEdgeStyle(relationType) === 'dotted' ? '2,2' : 'none'
  
  const opacity = isHighlighted ? 0.8 : Math.max(0.2, (similarityScore || 0.3) * 0.6)
  const strokeWidth = isHighlighted ? 2 : Math.max(1, (similarityScore || 0.3) * 2)

  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={isHighlighted ? "#b8b8ff" : color}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      opacity={opacity}
    />
  )
}

const MemoryMesh: React.FC<MemoryMeshProps> = ({
  className = '',
  autoRotate = false,
  expandNodeOnClick = true,
  userAddress,
  onNodeClick
}) => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [meshData, setMeshData] = useState<MemoryMesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch mesh data from API
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

  // Force-directed layout algorithm
  const layoutNodes = (nodes: MemoryMeshNode[], edges: { source: string; target: string; relation_type?: string; similarity_score?: number }[]) => {
    const width = 1200
    const height = 800
    const iterations = 100
    const k = Math.sqrt((width * height) / nodes.length)
    
    // Initialize positions
    const positionedNodes = nodes.map((node, i) => ({
      ...node,
      x: (i % 3) * (width / 3) + width / 6 + Math.random() * 50 - 25,
      y: Math.floor(i / 3) * (height / Math.ceil(nodes.length / 3)) + height / 6 + Math.random() * 50 - 25,
      vx: 0,
      vy: 0
    }))

    // Force simulation
    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion forces between all nodes
      for (let i = 0; i < positionedNodes.length; i++) {
        for (let j = i + 1; j < positionedNodes.length; j++) {
          const dx = positionedNodes[i].x - positionedNodes[j].x
          const dy = positionedNodes[i].y - positionedNodes[j].y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (k * k) / distance
          
          positionedNodes[i].vx += (dx / distance) * force * 0.01
          positionedNodes[i].vy += (dy / distance) * force * 0.01
          positionedNodes[j].vx -= (dx / distance) * force * 0.01
          positionedNodes[j].vy -= (dy / distance) * force * 0.01
        }
      }

      // Attraction forces for connected nodes
      edges.forEach(edge => {
        const source = positionedNodes.find(n => n.id === edge.source)
        const target = positionedNodes.find(n => n.id === edge.target)
        
        if (source && target) {
          const dx = target.x - source.x
          const dy = target.y - source.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (distance * distance) / k
          
          source.vx += (dx / distance) * force * 0.01
          source.vy += (dy / distance) * force * 0.01
          target.vx -= (dx / distance) * force * 0.01
          target.vy -= (dy / distance) * force * 0.01
        }
      })

      // Apply velocity and damping
      positionedNodes.forEach(node => {
        node.vx *= 0.9
        node.vy *= 0.9
        node.x += node.vx
        node.y += node.vy
        
        // Keep nodes within bounds
        node.x = Math.max(30, Math.min(width - 30, node.x))
        node.y = Math.max(30, Math.min(height - 30, node.y))
      })
    }

    return positionedNodes.map(node => ({
      id: node.id,
      type: node.type,
      label: node.label,
      memory_id: node.memory_id,
      title: node.title,
      summary: node.summary,
      content: node.content,
      full_content: node.full_content,
      importance_score: node.importance_score,
      tx_hash: node.tx_hash,
      block_number: node.block_number,
      blockchain_network: node.blockchain_network,
      tx_status: node.tx_status,
      x: node.x,
      y: node.y
    }))
  }

  // Transform API data to visualization format with proper positioning
  const { nodes, edges } = useMemo(() => {
    if (!meshData || !meshData.nodes || meshData.nodes.length === 0) {
      return { nodes: [], edges: [] }
    }

    // Use force-directed layout algorithm for better positioning
    const transformedNodes = layoutNodes(meshData.nodes, meshData.edges || [])
    const processedEdges = meshData.edges || []

    return {
      nodes: transformedNodes,
      edges: processedEdges
    }
  }, [meshData])


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
    
    // Call the parent callback to open sidebar and select memory
    if (onNodeClick) {
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        onNodeClick(node.memory_id)
      }
    }
    
    // Add visual feedback - briefly highlight the node
    const node = document.querySelector(`[data-node-id="${nodeId}"]`)
    if (node) {
      node.classList.add('node-clicked')
      setTimeout(() => {
        node.classList.remove('node-clicked')
      }, 300)
    }
  }

  const handleNodeHover = (nodeId: string, hovered: boolean) => {
    setHoveredNode(hovered ? nodeId : null)
  }

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
          <div className="text-sm font-mono text-gray-600">
            [CONNECT WALLET TO VIEW MESH]
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .memory-node {
            transition: all 0.2s ease-out;
          }
          .memory-node.node-clicked {
            transform: scale(1.2);
            filter: brightness(1.3);
          }
        `
      }} />
      <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200 relative overflow-hidden">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 800"
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
                relationType={edge.relation_type}
                similarityScore={edge.similarity_score}
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
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 text-xs font-mono">
          <div className="font-bold mb-2">Memory Types</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Manual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>On-chain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Browser</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Reasoning</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="font-bold mb-1">Relationships</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span>Semantic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-yellow-500 border-dashed border-t border-yellow-500"></div>
                <span>Topical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500 border-dotted border-t border-red-500"></div>
                <span>Temporal</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}

export { MemoryMesh }
