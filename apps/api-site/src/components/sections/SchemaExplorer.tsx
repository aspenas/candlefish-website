'use client'

import { useState } from 'react'
import { Card } from '@candlefish-ai/shared'
import { ChevronDown, ChevronRight, Type, List, Hash } from 'lucide-react'

interface SchemaType {
  name: string
  kind: 'OBJECT' | 'SCALAR' | 'ENUM' | 'INPUT_OBJECT'
  fields?: SchemaField[]
  description?: string
}

interface SchemaField {
  name: string
  type: string
  description?: string
  args?: SchemaField[]
}

const mockSchema: SchemaType[] = [
  {
    name: 'Query',
    kind: 'OBJECT',
    description: 'Root query type',
    fields: [
      {
        name: 'agents',
        type: '[Agent!]!',
        description: 'Get all agents',
        args: [
          { name: 'limit', type: 'Int', description: 'Maximum number of agents to return' },
          { name: 'status', type: 'AgentStatus', description: 'Filter by agent status' }
        ]
      },
      {
        name: 'agent',
        type: 'Agent',
        description: 'Get a single agent by ID',
        args: [
          { name: 'id', type: 'ID!', description: 'Agent ID' }
        ]
      }
    ]
  },
  {
    name: 'Mutation',
    kind: 'OBJECT',
    description: 'Root mutation type',
    fields: [
      {
        name: 'createAgent',
        type: 'Agent!',
        description: 'Create a new agent',
        args: [
          { name: 'input', type: 'CreateAgentInput!', description: 'Agent creation data' }
        ]
      },
      {
        name: 'updateAgent',
        type: 'Agent!',
        description: 'Update an existing agent',
        args: [
          { name: 'id', type: 'ID!', description: 'Agent ID' },
          { name: 'input', type: 'UpdateAgentInput!', description: 'Agent update data' }
        ]
      }
    ]
  },
  {
    name: 'Agent',
    kind: 'OBJECT',
    description: 'An AI agent',
    fields: [
      { name: 'id', type: 'ID!', description: 'Unique identifier' },
      { name: 'name', type: 'String!', description: 'Agent name' },
      { name: 'description', type: 'String', description: 'Agent description' },
      { name: 'status', type: 'AgentStatus!', description: 'Current status' },
      { name: 'capabilities', type: '[String!]!', description: 'Agent capabilities' },
      { name: 'createdAt', type: 'DateTime!', description: 'Creation timestamp' },
      { name: 'updatedAt', type: 'DateTime!', description: 'Last update timestamp' }
    ]
  }
]

export function SchemaExplorer() {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['Query', 'Mutation']))

  const toggleType = (typeName: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(typeName)) {
      newExpanded.delete(typeName)
    } else {
      newExpanded.add(typeName)
    }
    setExpandedTypes(newExpanded)
  }

  const getTypeIcon = (kind: string) => {
    switch (kind) {
      case 'OBJECT': return <Type className="h-4 w-4 text-[#14b8a6]" />
      case 'SCALAR': return <Hash className="h-4 w-4 text-[#f59e0b]" />
      case 'ENUM': return <List className="h-4 w-4 text-[#22d3ee]" />
      default: return <Type className="h-4 w-4 text-[#a3b3bf]" />
    }
  }

  const insertField = (fieldName: string, typeName: string) => {
    // This would normally insert the field into the query editor
    console.log(`Insert ${fieldName} from ${typeName}`)
  }

  return (
    <Card className="h-full bg-[#0f172a]/50 border-[#0f172a]/20">
      {/* Header */}
      <div className="p-4 border-b border-[#0f172a]/20">
        <h3 className="text-lg font-semibold text-[#e6f9f6]">Schema Explorer</h3>
        <p className="text-sm text-[#a3b3bf] mt-1">
          Click types and fields to explore the schema
        </p>
      </div>

      {/* Schema Tree */}
      <div className="p-4 overflow-auto">
        {mockSchema.map((type) => (
          <div key={type.name} className="mb-4">
            {/* Type Header */}
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-[#0b0f13]/50 p-2 rounded"
              onClick={() => toggleType(type.name)}
            >
              {expandedTypes.has(type.name) ? (
                <ChevronDown className="h-4 w-4 text-[#a3b3bf]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#a3b3bf]" />
              )}
              {getTypeIcon(type.kind)}
              <span className="font-medium text-[#e6f9f6]">{type.name}</span>
              <span className="text-xs text-[#a3b3bf] uppercase">{type.kind}</span>
            </div>

            {/* Type Description */}
            {type.description && expandedTypes.has(type.name) && (
              <div className="ml-8 text-sm text-[#a3b3bf] mb-2">
                {type.description}
              </div>
            )}

            {/* Fields */}
            {expandedTypes.has(type.name) && type.fields && (
              <div className="ml-6 space-y-1">
                {type.fields.map((field) => (
                  <div key={field.name}>
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:bg-[#0b0f13]/50 p-1 rounded text-sm"
                      onClick={() => insertField(field.name, type.name)}
                    >
                      <span className="text-[#22d3ee]">{field.name}</span>
                      <span className="text-[#a3b3bf]">:</span>
                      <span className="text-[#f59e0b]">{field.type}</span>
                    </div>
                    {field.description && (
                      <div className="ml-4 text-xs text-[#a3b3bf]">
                        {field.description}
                      </div>
                    )}
                    {field.args && field.args.length > 0 && (
                      <div className="ml-4 text-xs">
                        <span className="text-[#a3b3bf]">Arguments:</span>
                        {field.args.map((arg) => (
                          <div key={arg.name} className="ml-2">
                            <span className="text-[#22d3ee]">{arg.name}</span>
                            <span className="text-[#a3b3bf]">: </span>
                            <span className="text-[#f59e0b]">{arg.type}</span>
                            {arg.description && (
                              <span className="text-[#a3b3bf] ml-2">- {arg.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
