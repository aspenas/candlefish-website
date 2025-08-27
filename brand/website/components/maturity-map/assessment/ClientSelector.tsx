'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@apollo/client'
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  BuildingOfficeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CreateClientModal } from './CreateClientModal'
import { GET_CLIENTS, CREATE_CLIENT } from '@/lib/graphql/queries'
import type { Client, CreateClientInput } from '@/lib/graphql/types'

interface ClientSelectorProps {
  operatorId: string
  selectedClientId?: string
  onSelect: (clientId: string) => void
}

export function ClientSelector({
  operatorId,
  selectedClientId,
  onSelect
}: ClientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data, loading, refetch } = useQuery(GET_CLIENTS, {
    variables: { operatorId }
  })

  const [createClient, { loading: creating }] = useMutation(CREATE_CLIENT, {
    onCompleted: (data) => {
      onSelect(data.createClient.id)
      setShowCreateModal(false)
      refetch()
    }
  })

  const clients: Client[] = data?.clients || []

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactInfo.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateClient = async (input: CreateClientInput) => {
    try {
      await createClient({ variables: { input } })
    } catch (error) {
      console.error('Failed to create client:', error)
    }
  }

  const getIndustryIcon = (industry: string) => {
    switch (industry) {
      case 'MANUFACTURING': return '🏭'
      case 'HEALTHCARE': return '🏥'
      case 'RETAIL': return '🏪'
      case 'TECHNOLOGY': return '💻'
      case 'CONSTRUCTION': return '🏗️'
      case 'AUTOMOTIVE': return '🚗'
      case 'ENERGY': return '⚡'
      case 'AGRICULTURE': return '🌾'
      case 'LOGISTICS': return '🚛'
      case 'HOSPITALITY': return '🏨'
      case 'EDUCATION': return '📚'
      case 'GOVERNMENT': return '🏛️'
      case 'CONSULTING': return '💼'
      default: return '🏢'
    }
  }

  const getClientAssessmentStats = (client: Client) => {
    if (!client.assessments || client.assessments.length === 0) {
      return { total: 0, completed: 0, averageScore: null }
    }

    const completed = client.assessments.filter(a => a.status === 'COMPLETED').length
    const scores = client.assessments
      .filter(a => a.maturityScore > 0)
      .map(a => a.maturityScore)
    
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : null

    return {
      total: client.assessments.length,
      completed,
      averageScore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Search and Add New */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add New Client</span>
          </Button>
        </div>

        {/* Clients Grid */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClients.map((client, index) => {
              const stats = getClientAssessmentStats(client)
              const isSelected = selectedClientId === client.id

              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                      isSelected
                        ? 'ring-2 ring-blue-400 bg-blue-500/10 border-blue-500/30'
                        : 'hover:border-blue-500/50'
                    }`}
                    onClick={() => onSelect(client.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {getIndustryIcon(client.industry)}
                        </div>
                        <div>
                          <h3 className="text-white font-medium text-lg">
                            {client.name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {client.industry.replace('_', ' ').toLowerCase()
                              .replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Badge className="bg-blue-500 text-white">
                          Selected
                        </Badge>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="mb-4 text-sm text-gray-400">
                      <p>{client.contactInfo.email}</p>
                      {client.contactInfo.phone && (
                        <p>{client.contactInfo.phone}</p>
                      )}
                    </div>

                    {/* Assessment Stats */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <UserGroupIcon className="w-3 h-3" />
                          <span>{stats.total} assessments</span>
                        </div>
                        {stats.completed > 0 && (
                          <div className="flex items-center space-x-1">
                            <BuildingOfficeIcon className="w-3 h-3" />
                            <span>{stats.completed} completed</span>
                          </div>
                        )}
                      </div>
                      {stats.averageScore && (
                        <div className="text-sm font-medium text-blue-400">
                          {stats.averageScore.toFixed(1)}% avg
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white text-lg mb-2">
              {searchTerm ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Add your first client to get started with assessments'
              }
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 mx-auto"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Client</span>
            </Button>
          </div>
        )}

        {/* Selected Client Summary */}
        {selectedClientId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6"
          >
            {(() => {
              const selectedClient = clients.find(c => c.id === selectedClientId)
              if (!selectedClient) return null

              return (
                <Card className="p-4 bg-green-500/10 border-green-500/30">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getIndustryIcon(selectedClient.industry)}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">
                        {selectedClient.name}
                      </h4>
                      <p className="text-green-200 text-sm">Selected client</p>
                    </div>
                  </div>
                </Card>
              )
            })()}
          </motion.div>
        )}
      </div>

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClient}
        operatorId={operatorId}
        isLoading={creating}
      />
    </>
  )
}