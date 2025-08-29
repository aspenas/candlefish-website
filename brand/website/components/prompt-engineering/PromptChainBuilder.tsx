'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PromptChain, ChainStep, PromptTemplate } from '@/lib/prompt-engineering/types';

interface Node {
  id: string;
  type: 'step' | 'condition' | 'parallel';
  data: ChainStep | any;
  position: { x: number; y: number };
  connections: string[];
}

interface Connection {
  from: string;
  to: string;
  fromPort: 'output' | 'success' | 'error';
  toPort: 'input';
}

interface ChainBuilderState {
  chain: PromptChain | null;
  nodes: Node[];
  connections: Connection[];
  selectedNode: Node | null;
  draggedNode: Node | null;
  dragOffset: { x: number; y: number };
  isExecuting: boolean;
  showTemplateSelector: boolean;
}

const TEMPLATE_OPTIONS: PromptTemplate[] = [
  {
    id: 'code-review-automated',
    name: 'Code Review',
    version: '1.0.0',
    description: 'Automated code review',
    category: 'code-review',
    modelCompatibility: ['anthropic', 'openai'],
    template: 'Review this code...',
    variables: [],
    metadata: {
      author: 'system',
      team: 'engineering',
      approvalStatus: 'approved',
    },
    tags: ['automation', 'quality'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-generation-unit',
    name: 'Unit Test Generation',
    version: '1.0.0',
    description: 'Generate unit tests',
    category: 'test-generation',
    modelCompatibility: ['anthropic', 'openai'],
    template: 'Generate tests...',
    variables: [],
    metadata: {
      author: 'system',
      team: 'engineering',
      approvalStatus: 'approved',
    },
    tags: ['testing', 'automation'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const PromptChainBuilder: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ChainBuilderState>({
    chain: null,
    nodes: [],
    connections: [],
    selectedNode: null,
    draggedNode: null,
    dragOffset: { x: 0, y: 0 },
    isExecuting: false,
    showTemplateSelector: false,
  });

  const handleAddNode = (templateId: string) => {
    const template = TEMPLATE_OPTIONS.find(t => t.id === templateId);
    if (!template) return;

    const newNode: Node = {
      id: `step-${Date.now()}`,
      type: 'step',
      data: {
        id: `step-${Date.now()}`,
        templateId: template.id,
        name: template.name,
        description: template.description,
        dependsOn: [],
        parallel: false,
        timeout: 30,
        retryCount: 3,
      },
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
      connections: [],
    };

    setState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      showTemplateSelector: false,
    }));
  };

  const handleNodeMouseDown = (node: Node, event: React.MouseEvent) => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setState(prev => ({
      ...prev,
      draggedNode: node,
      dragOffset: {
        x: event.clientX - rect.left - node.position.x,
        y: event.clientY - rect.top - node.position.y,
      },
      selectedNode: node,
    }));
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!state.draggedNode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = event.clientX - rect.left - state.dragOffset.x;
    const newY = event.clientY - rect.top - state.dragOffset.y;

    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === prev.draggedNode?.id
          ? { ...node, position: { x: newX, y: newY } }
          : node
      ),
    }));
  }, [state.draggedNode, state.dragOffset]);

  const handleMouseUp = useCallback(() => {
    setState(prev => ({ ...prev, draggedNode: null }));
  }, []);

  React.useEffect(() => {
    if (state.draggedNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [state.draggedNode, handleMouseMove, handleMouseUp]);

  const handleDeleteNode = (nodeId: string) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(
        conn => conn.from !== nodeId && conn.to !== nodeId
      ),
      selectedNode: prev.selectedNode?.id === nodeId ? null : prev.selectedNode,
    }));
  };

  const handleSaveChain = () => {
    if (!state.chain) return;

    const chainData: PromptChain = {
      ...state.chain,
      steps: state.nodes
        .filter(node => node.type === 'step')
        .map(node => node.data as ChainStep),
    };

    console.log('Saving chain:', chainData);
    // TODO: Implement save to backend
  };

  const handleExecuteChain = async () => {
    if (state.nodes.length === 0) return;

    setState(prev => ({ ...prev, isExecuting: true }));
    
    // TODO: Implement chain execution
    setTimeout(() => {
      setState(prev => ({ ...prev, isExecuting: false }));
    }, 3000);
  };

  const renderNode = (node: Node) => {
    const isSelected = state.selectedNode?.id === node.id;
    
    return (
      <div
        key={node.id}
        className={`absolute bg-white border rounded-lg shadow-lg cursor-move select-none ${
          isSelected ? 'border-operation-active ring-2 ring-operation-active/20' : 'border-atelier-structure'
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          width: 200,
          minHeight: 80,
        }}
        onMouseDown={(e) => handleNodeMouseDown(node, e)}
      >
        {/* Node Header */}
        <div className={`p-3 border-b rounded-t-lg ${
          node.type === 'step' ? 'bg-blue-50' : 'bg-yellow-50'
        }`}>
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-ink-primary truncate">
              {node.data.name || node.type}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.id);
              }}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              ×
            </button>
          </div>
          {node.data.templateId && (
            <Badge variant="outline" size="xs" className="mt-1">
              {node.data.templateId}
            </Badge>
          )}
        </div>

        {/* Node Content */}
        <div className="p-3">
          <div className="text-xs text-ink-secondary mb-2">
            {node.data.description || 'No description'}
          </div>
          
          {node.type === 'step' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-secondary">
                Timeout: {node.data.timeout || 30}s
              </span>
              <span className="text-ink-secondary">
                Retries: {node.data.retryCount || 3}
              </span>
            </div>
          )}
        </div>

        {/* Connection Points */}
        <div className="absolute -left-2 top-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-white transform -translate-y-1/2 cursor-pointer">
          <div className="absolute inset-0 rounded-full bg-green-500 opacity-50"></div>
        </div>
        <div className="absolute -right-2 top-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white transform -translate-y-1/2 cursor-pointer">
          <div className="absolute inset-0 rounded-full bg-blue-500 opacity-50"></div>
        </div>
      </div>
    );
  };

  const renderConnections = () => {
    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {state.connections.map((conn, index) => {
          const fromNode = state.nodes.find(n => n.id === conn.from);
          const toNode = state.nodes.find(n => n.id === conn.to);
          
          if (!fromNode || !toNode) return null;
          
          const fromX = fromNode.position.x + 200;
          const fromY = fromNode.position.y + 40;
          const toX = toNode.position.x;
          const toY = toNode.position.y + 40;
          
          const midX = (fromX + toX) / 2;
          
          return (
            <path
              key={index}
              d={`M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#3b82f6"
            />
          </marker>
        </defs>
      </svg>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-ink-primary">
          Prompt Chain Builder
        </h3>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, showTemplateSelector: !prev.showTemplateSelector }))}
          >
            Add Step
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExecuteChain}
            disabled={state.isExecuting || state.nodes.length === 0}
          >
            {state.isExecuting ? 'Executing...' : 'Execute Chain'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveChain}
            disabled={state.nodes.length === 0}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Template Selector */}
      {state.showTemplateSelector && (
        <Card className="p-4">
          <h4 className="font-medium text-ink-primary mb-3">Select Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATE_OPTIONS.map((template) => (
              <button
                key={template.id}
                onClick={() => handleAddNode(template.id)}
                className="text-left p-3 border border-atelier-structure rounded hover:border-operation-active hover:bg-atelier-structure/10 transition-colors"
              >
                <h5 className="font-medium text-ink-primary mb-1">{template.name}</h5>
                <p className="text-xs text-ink-secondary mb-2">{template.description}</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" size="xs" className="capitalize">
                    {template.category.replace('-', ' ')}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Canvas */}
      <Card className="relative overflow-hidden" style={{ height: '600px' }}>
        <div
          ref={canvasRef}
          className="absolute inset-0 bg-gray-50"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)
            `,
            backgroundSize: '20px 20px',
          }}
        >
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Connections */}
          {renderConnections()}
          
          {/* Nodes */}
          {state.nodes.map(renderNode)}
          
          {/* Empty State */}
          {state.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-ink-secondary">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <h4 className="text-lg font-medium mb-2">Build Your Prompt Chain</h4>
                <p className="text-sm mb-4">Connect prompt templates to create automated workflows</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, showTemplateSelector: true }))}
                >
                  Add First Step
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Properties Panel */}
      {state.selectedNode && (
        <Card className="p-4">
          <h4 className="font-medium text-ink-primary mb-3">Step Properties</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">
                Step Name
              </label>
              <Input
                value={state.selectedNode.data.name || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setState(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(node =>
                      node.id === prev.selectedNode?.id
                        ? { ...node, data: { ...node.data, name: value } }
                        : node
                    ),
                  }));
                }}
                placeholder="Enter step name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">
                Template ID
              </label>
              <Input
                value={state.selectedNode.data.templateId || ''}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">
                Timeout (seconds)
              </label>
              <Input
                type="number"
                value={state.selectedNode.data.timeout || 30}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setState(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(node =>
                      node.id === prev.selectedNode?.id
                        ? { ...node, data: { ...node.data, timeout: value } }
                        : node
                    ),
                  }));
                }}
                min={5}
                max={300}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">
                Retry Count
              </label>
              <Input
                type="number"
                value={state.selectedNode.data.retryCount || 3}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setState(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(node =>
                      node.id === prev.selectedNode?.id
                        ? { ...node, data: { ...node.data, retryCount: value } }
                        : node
                    ),
                  }));
                }}
                min={0}
                max={10}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={state.selectedNode.data.parallel || false}
                onChange={(e) => {
                  setState(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(node =>
                      node.id === prev.selectedNode?.id
                        ? { ...node, data: { ...node.data, parallel: e.target.checked } }
                        : node
                    ),
                  }));
                }}
                className="rounded border-atelier-structure"
              />
              <span className="text-sm">Run in parallel</span>
            </label>
          </div>
        </Card>
      )}
    </div>
  );
};