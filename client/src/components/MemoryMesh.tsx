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
            x={node.x - 40}
            y={node.y - finalSize - 25}
            width={80}
            height={20}
            fill="rgba(0,0,0,0.8)"
            rx={3}
          />
          <text
            x={node.x}
            y={node.y - finalSize - 10}
            textAnchor="middle"
            fontSize="9"
            fill="#fff"
            fontFamily="monospace"
          >
            {node.label}
          </text>
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
  userAddress
}) => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [meshData, setMeshData] = useState<MemoryMesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<MemoryMeshNode | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

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
    const width = 400
    const height = 300
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
      importance_score: node.importance_score,
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
    
    // Show detailed view
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedNodeDetails(node)
      setShowDetailsModal(true)
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

        {/* Overlay text */}
        <div className="absolute bottom-4 left-4 text-xs font-mono text-gray-500">
          [FIG. 3] Live Memory Mesh ({nodes.length} nodes, {edges.length} connections)
        </div>
      </div>

      {/* Memory Details Modal */}
      {showDetailsModal && selectedNodeDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light">Memory Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Memory Type Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-600">Type:</span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-mono text-white"
                    style={{ backgroundColor: nodeColors[selectedNodeDetails.type] || '#666666' }}
                  >
                    {selectedNodeDetails.type.toUpperCase()}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <span className="text-sm font-mono text-gray-600 block mb-1">Title:</span>
                  <h3 className="text-lg font-light">{selectedNodeDetails.title || 'Untitled Memory'}</h3>
                </div>

                {/* Summary */}
                {selectedNodeDetails.summary && (
                  <div>
                    <span className="text-sm font-mono text-gray-600 block mb-1">Summary:</span>
                    <p className="text-gray-800 leading-relaxed">{selectedNodeDetails.summary}</p>
                  </div>
                )}

                {/* Memory ID */}
                <div>
                  <span className="text-sm font-mono text-gray-600 block mb-1">Memory ID:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {selectedNodeDetails.memory_id}
                  </code>
                </div>

                {/* Importance Score */}
                <div>
                  <span className="text-sm font-mono text-gray-600 block mb-1">Importance Score:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(selectedNodeDetails.importance_score || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-mono">
                      {((selectedNodeDetails.importance_score || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Related Connections */}
                <div>
                  <span className="text-sm font-mono text-gray-600 block mb-2">Related Connections:</span>
                  <div className="space-y-2">
                    {edges
                      .filter(edge => edge.source === selectedNodeDetails.id || edge.target === selectedNodeDetails.id)
                      .map((edge, index) => {
                        const relatedNode = nodes.find(n => 
                          n.id === (edge.source === selectedNodeDetails.id ? edge.target : edge.source)
                        )
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: nodeColors[relatedNode?.type || 'manual'] || '#666666' }}
                              ></div>
                              <span className="text-sm font-mono">{relatedNode?.label || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{edge.relation_type}</span>
                              <span className="text-xs font-mono bg-blue-100 px-2 py-1 rounded">
                                {((edge.similarity_score || 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    {edges.filter(edge => edge.source === selectedNodeDetails.id || edge.target === selectedNodeDetails.id).length === 0 && (
                      <p className="text-sm text-gray-500 italic">No connections found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { MemoryMesh }
