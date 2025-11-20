import React, { useEffect, useMemo, useRef, useState } from "react"
import { Line, OrbitControls, Text } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"

import type { MemoryMesh, MemoryMeshEdge } from "../../types/memory.type"

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

  if (key && nodeColors[key]) {
    return nodeColors[key]
  }

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

const MemoryNodePreview: React.FC<{
  position: [number, number, number]
  color: string
  importance?: number
  label?: string
  isHighlighted?: boolean
  pulseIntensity?: number
}> = ({
  position,
  color,
  importance = 0.5,
  label,
  isHighlighted = false,
  pulseIntensity = 0,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const textRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [hovered, setHovered] = useState(false)

  const baseSize = 0.015 + importance * 0.008
  const size = baseSize

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return
    const nodePosition = groupRef.current.position
    const distance = camera.position.distanceTo(nodePosition)
    const fovRad =
      camera instanceof THREE.PerspectiveCamera && camera.fov
        ? (camera.fov * Math.PI) / 180
        : (60 * Math.PI) / 180
    const worldPerceivedScale = Math.tan(fovRad / 2) * 2
    const dynamicScale = Math.min(
      8,
      Math.max(0.5, distance * worldPerceivedScale * 0.1)
    )
    const hoverScale = hovered ? 1.3 : 1.0
    const pulseScale = isHighlighted
      ? 1 + Math.sin(state.clock.elapsedTime * 3) * pulseIntensity * 0.3
      : 1.0
    meshRef.current.scale.setScalar(dynamicScale * hoverScale * pulseScale)

    if (textRef.current) {
      textRef.current.lookAt(camera.position)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial
          color={isHighlighted ? "#3b82f6" : color}
          metalness={0.3}
          roughness={0.4}
          emissive={isHighlighted ? "#3b82f6" : color}
          emissiveIntensity={isHighlighted ? 0.6 : hovered ? 0.4 : 0.2}
        />
      </mesh>
      {label && (
        <group ref={textRef}>
          <Text
            position={[0, size * 12, 0]}
            fontSize={0.03}
            color="#000000"
            anchorX="center"
            anchorY="middle"
            maxWidth={5}
            outlineWidth={0.03}
            outlineColor="#ffffff"
            outlineOpacity={1}
            depthOffset={-1}
          >
            {label.length > 30 ? `${label.substring(0, 30)}...` : label}
          </Text>
        </group>
      )}
    </group>
  )
}

const MemoryEdgePreview: React.FC<{
  start: [number, number, number]
  end: [number, number, number]
  similarity: number
}> = ({ start, end, similarity }) => {
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
  const opacity = similarity > 0.75 ? 0.8 : similarity > 0.5 ? 0.6 : 0.4
  const lineWidth = similarity > 0.85 ? 0.6 : similarity > 0.75 ? 0.5 : 0.3

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

const RotatingMesh: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  return <group ref={groupRef}>{children}</group>
}

const MemoryMesh3DPreview: React.FC<{
  meshData: MemoryMesh
  highlightedNodes?: Set<string>
  pulseIntensity?: number
}> = ({ meshData, highlightedNodes = new Set(), pulseIntensity = 0 }) => {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 0, 3.5)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const nodes = useMemo(() => {
    if (!meshData?.nodes?.length) return []

    const nodeCount = meshData.nodes.length
    const sphereRadius = 1.2

    const normalizedPositions: [number, number, number][] = new Array(nodeCount)

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.acos(-1 + (2 * i) / nodeCount)
      const phi = Math.sqrt(nodeCount * Math.PI) * theta

      const x = sphereRadius * Math.cos(phi) * Math.sin(theta)
      const y = sphereRadius * Math.sin(phi) * Math.sin(theta)
      const z = sphereRadius * Math.cos(theta)

      normalizedPositions[i] = [x, y, z]
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

      const color = resolveNodeColor(String(n.type))

      result[i] = {
        id: n.id,
        position: finalPos,
        color,
        importance: n.importance_score,
        label: n.title || n.label || "",
      }
    }

    return result as Array<{
      id: string
      position: [number, number, number]
      color: string
      importance?: number
      label?: string
    }>
  }, [meshData])

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
        })
      }
    })

    return result
  }, [meshData, nodes])

  return (
    <>
      <fog attach="fog" args={["#f9fafb", 1.5, 6]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 8]} intensity={1.0} />
      <directionalLight position={[-10, -10, -8]} intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />

      <RotatingMesh>
        {nodes.map((node) => (
          <MemoryNodePreview
            key={node.id}
            position={node.position}
            color={node.color}
            importance={node.importance}
            label={node.label}
            isHighlighted={highlightedNodes.has(node.id)}
            pulseIntensity={highlightedNodes.has(node.id) ? pulseIntensity : 0}
          />
        ))}

        {edges.map((edge, index) => (
          <MemoryEdgePreview
            key={`edge-${index}-${edge.start.join(",")}-${edge.end.join(",")}`}
            start={edge.start}
            end={edge.end}
            similarity={edge.similarity}
          />
        ))}
      </RotatingMesh>
    </>
  )
}

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

export const MemoryMesh3DContainer: React.FC<{
  meshData: MemoryMesh
  highlightedNodes?: Set<string>
  pulseIntensity?: number
}> = ({ meshData, highlightedNodes = new Set(), pulseIntensity = 0 }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  return (
    <Canvas
      camera={{
        position: [0, 0, 3.5],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      style={{ background: "transparent" }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <MemoryMesh3DPreview
        meshData={meshData}
        highlightedNodes={highlightedNodes}
        pulseIntensity={pulseIntensity}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={false}
        enableRotate={true}
        zoomToCursor={true}
        minDistance={2}
        maxDistance={8}
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
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      <ControlsUpdater controlsRef={controlsRef} />
    </Canvas>
  )
}
