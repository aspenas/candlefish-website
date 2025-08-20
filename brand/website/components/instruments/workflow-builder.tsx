'use client'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Node {
  id: string
  type: 'start' | 'process' | 'decision' | 'end'
  name: string
  x: number
  y: number
  duration?: number
  probability?: number
}

interface Connection {
  from: string
  to: string
  label?: string
}

export const WorkflowBuilder = ({ demoMode = false }: { demoMode?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'start', type: 'start', name: 'Start', x: 100, y: 250 },
    { id: 'end', type: 'end', name: 'End', x: 700, y: 250 }
  ])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    totalTime: 0,
    bottlenecks: [] as string[],
    efficiency: 100
  })

  // Draw workflow on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw connections
    ctx.strokeStyle = '#415A77'
    ctx.lineWidth = 2
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from)
      const toNode = nodes.find(n => n.id === conn.to)
      if (fromNode && toNode) {
        ctx.beginPath()
        ctx.moveTo(fromNode.x + 40, fromNode.y + 20)
        ctx.lineTo(toNode.x, toNode.y + 20)
        ctx.stroke()
        
        // Draw arrow
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x - 40)
        ctx.beginPath()
        ctx.moveTo(toNode.x, toNode.y + 20)
        ctx.lineTo(toNode.x - 10 * Math.cos(angle - Math.PI / 6), toNode.y + 20 - 10 * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(toNode.x, toNode.y + 20)
        ctx.lineTo(toNode.x - 10 * Math.cos(angle + Math.PI / 6), toNode.y + 20 - 10 * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
      }
    })
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.fillStyle = node.type === 'start' ? '#3FD3C6' : 
                     node.type === 'end' ? '#E84855' :
                     node.type === 'decision' ? '#FFB400' : '#415A77'
      
      if (node.type === 'decision') {
        // Draw diamond
        ctx.beginPath()
        ctx.moveTo(node.x + 40, node.y)
        ctx.lineTo(node.x + 80, node.y + 20)
        ctx.lineTo(node.x + 40, node.y + 40)
        ctx.lineTo(node.x, node.y + 20)
        ctx.closePath()
        ctx.fill()
      } else {
        // Draw rectangle
        ctx.fillRect(node.x, node.y, 80, 40)
      }
      
      // Draw text
      ctx.fillStyle = '#F8F8F2'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(node.name, node.x + 40, node.y + 25)
      
      // Highlight selected
      if (selectedNode === node.id) {
        ctx.strokeStyle = '#3FD3C6'
        ctx.lineWidth = 3
        if (node.type === 'decision') {
          ctx.beginPath()
          ctx.moveTo(node.x + 40, node.y - 2)
          ctx.lineTo(node.x + 82, node.y + 20)
          ctx.lineTo(node.x + 40, node.y + 42)
          ctx.lineTo(node.x - 2, node.y + 20)
          ctx.closePath()
          ctx.stroke()
        } else {
          ctx.strokeRect(node.x - 2, node.y - 2, 84, 44)
        }
      }
    })
  }, [nodes, connections, selectedNode])

  const addNode = (type: 'process' | 'decision') => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      name: type === 'process' ? 'Process' : 'Decision',
      x: 400,
      y: 150 + nodes.length * 50,
      duration: type === 'process' ? 5 : 0
    }
    setNodes([...nodes, newNode])
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if clicked on a node
    const clickedNode = nodes.find(node => 
      x >= node.x && x <= node.x + 80 &&
      y >= node.y && y <= node.y + 40
    )
    
    if (clickedNode) {
      if (connecting) {
        // Create connection
        if (connecting !== clickedNode.id) {
          setConnections([...connections, { from: connecting, to: clickedNode.id }])
        }
        setConnecting(null)
      } else {
        setSelectedNode(clickedNode.id)
      }
    } else {
      setSelectedNode(null)
      setConnecting(null)
    }
  }

  const analyzeWorkflow = () => {
    // Simple analysis
    const processNodes = nodes.filter(n => n.type === 'process')
    const totalTime = processNodes.reduce((sum, n) => sum + (n.duration || 0), 0)
    
    // Find bottlenecks (nodes with high duration)
    const bottlenecks = processNodes
      .filter(n => (n.duration || 0) > 10)
      .map(n => n.name)
    
    // Calculate efficiency (simplified)
    const efficiency = Math.max(0, 100 - (bottlenecks.length * 15))
    
    setMetrics({ totalTime, bottlenecks, efficiency })
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-light text-[#F8F8F2] mb-4">
            Workflow Builder
          </h1>
          <p className="text-[#415A77]">
            Model operational processes with constraints and visualize bottlenecks
          </p>
        </header>

        {/* Toolbar */}
        <div className="bg-[#1C1C1C] border border-[#415A77] p-4 mb-8">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => addNode('process')}
              className="px-4 py-2 bg-[#415A77] text-[#F8F8F2] hover:bg-[#3FD3C6] 
                       hover:text-[#0D1B2A] transition-colors"
            >
              + Add Process
            </button>
            
            <button
              onClick={() => addNode('decision')}
              className="px-4 py-2 bg-[#415A77] text-[#F8F8F2] hover:bg-[#FFB400] 
                       hover:text-[#0D1B2A] transition-colors"
            >
              + Add Decision
            </button>
            
            <button
              onClick={() => selectedNode && setConnecting(selectedNode)}
              disabled={!selectedNode}
              className="px-4 py-2 bg-[#415A77] text-[#F8F8F2] hover:bg-[#3FD3C6] 
                       hover:text-[#0D1B2A] transition-colors disabled:opacity-50"
            >
              Connect From Selected
            </button>
            
            <div className="flex-1" />
            
            <button
              onClick={analyzeWorkflow}
              className="px-6 py-2 bg-[#3FD3C6] text-[#0D1B2A] font-medium 
                       hover:bg-[#4FE3D6] transition-colors"
            >
              Analyze Workflow
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-4 gap-8">
          {/* Canvas */}
          <div className="col-span-3">
            <div className="bg-[#1C1C1C] border border-[#415A77] p-4">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onClick={handleCanvasClick}
                className="w-full cursor-crosshair"
                style={{ background: '#0D1B2A' }}
              />
              
              {connecting && (
                <p className="text-[#3FD3C6] text-sm mt-2">
                  Click on a node to connect from {nodes.find(n => n.id === connecting)?.name}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Node Properties */}
            {selectedNode && (
              <div className="bg-[#1C1C1C] border border-[#415A77] p-4">
                <h3 className="text-[#3FD3C6] mb-4">Node Properties</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[#415A77] text-sm">Name</label>
                    <input
                      type="text"
                      value={nodes.find(n => n.id === selectedNode)?.name || ''}
                      onChange={(e) => {
                        setNodes(nodes.map(n => 
                          n.id === selectedNode ? { ...n, name: e.target.value } : n
                        ))
                      }}
                      className="w-full bg-[#0D1B2A] border border-[#415A77] px-3 py-2 
                               text-[#F8F8F2] text-sm"
                    />
                  </div>
                  
                  {nodes.find(n => n.id === selectedNode)?.type === 'process' && (
                    <div>
                      <label className="text-[#415A77] text-sm">Duration (min)</label>
                      <input
                        type="number"
                        value={nodes.find(n => n.id === selectedNode)?.duration || 0}
                        onChange={(e) => {
                          setNodes(nodes.map(n => 
                            n.id === selectedNode ? { ...n, duration: parseInt(e.target.value) } : n
                          ))
                        }}
                        className="w-full bg-[#0D1B2A] border border-[#415A77] px-3 py-2 
                                 text-[#F8F8F2] text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="bg-[#1C1C1C] border border-[#415A77] p-4">
              <h3 className="text-[#3FD3C6] mb-4">Workflow Metrics</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-[#415A77] text-sm">Total Time</p>
                  <p className="text-[#F8F8F2] text-2xl font-light">
                    {metrics.totalTime} min
                  </p>
                </div>
                
                <div>
                  <p className="text-[#415A77] text-sm">Efficiency Score</p>
                  <p className="text-[#F8F8F2] text-2xl font-light">
                    {metrics.efficiency}%
                  </p>
                </div>
                
                {metrics.bottlenecks.length > 0 && (
                  <div>
                    <p className="text-[#E84855] text-sm">Bottlenecks Detected</p>
                    <ul className="text-[#F8F8F2] text-sm mt-2">
                      {metrics.bottlenecks.map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-[#1C1C1C] border border-[#415A77] p-4">
              <h3 className="text-[#3FD3C6] mb-4">Legend</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#3FD3C6]" />
                  <span className="text-[#E0E1DD]">Start Node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#415A77]" />
                  <span className="text-[#E0E1DD]">Process</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#FFB400] transform rotate-45" />
                  <span className="text-[#E0E1DD]">Decision</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#E84855]" />
                  <span className="text-[#E0E1DD]">End Node</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}