'use client'

import { useState, useEffect } from 'react'
import { MapPin, Clock, Star, Filter, Search, ChevronDown, Users, Wifi, WifiOff } from 'lucide-react'
import { usePWA } from '@/components/providers/PWAProvider'

// Mock operator data - would come from GraphQL in real implementation
const operators = [
  {
    id: '1',
    name: 'Sarah Chen',
    location: 'San Francisco, CA',
    distance: '2.3 mi',
    rating: 4.9,
    reviews: 127,
    specialties: ['IoT Integration', 'Smart Buildings'],
    availability: 'Available Now',
    status: 'online',
    lastActive: '5 min ago',
    responseTime: '< 1 hour',
    avatar: '/avatars/sarah-chen.jpg'
  },
  {
    id: '2', 
    name: 'Marcus Rodriguez',
    location: 'Austin, TX',
    distance: '1.8 mi',
    rating: 4.8,
    reviews: 89,
    specialties: ['Industrial Automation', 'Predictive Maintenance'],
    availability: 'Available Today',
    status: 'online',
    lastActive: '12 min ago', 
    responseTime: '< 2 hours',
    avatar: '/avatars/marcus-rodriguez.jpg'
  },
  {
    id: '3',
    name: 'Emma Thompson',
    location: 'Seattle, WA',
    distance: '5.1 mi',
    rating: 4.9,
    reviews: 203,
    specialties: ['Healthcare AI', 'Regulatory Compliance'],
    availability: 'Available Tomorrow',
    status: 'away',
    lastActive: '2 hours ago',
    responseTime: '< 4 hours',
    avatar: '/avatars/emma-thompson.jpg'
  }
]

const filters = [
  { id: 'availability', label: 'Availability', options: ['Available Now', 'Today', 'This Week'] },
  { id: 'specialty', label: 'Specialty', options: ['IoT Integration', 'Industrial Automation', 'Healthcare AI'] },
  { id: 'distance', label: 'Distance', options: ['< 5 mi', '< 10 mi', '< 25 mi'] },
  { id: 'rating', label: 'Rating', options: ['4.8+', '4.5+', '4.0+'] }
]

export function MobileOperatorNetwork() {
  const { isOnline } = usePWA()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'availability'>('distance')

  // Filter operators based on search and filters
  const filteredOperators = operators.filter(operator => {
    if (searchTerm && !operator.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !operator.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false
    }
    
    // Apply filters
    for (const [filterType, filterValue] of Object.entries(selectedFilters)) {
      if (!filterValue) continue
      
      switch (filterType) {
        case 'availability':
          if (!operator.availability.includes(filterValue)) return false
          break
        case 'specialty':
          if (!operator.specialties.some(s => s.includes(filterValue))) return false
          break
        // Add more filter logic as needed
      }
    }
    
    return true
  })

  return (
    <section className="py-8 bg-gray-50 min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Operator Network
            </h2>
            {!isOnline && (
              <div className="flex items-center gap-2 px-2 py-1 bg-yellow-100 rounded-full">
                <WifiOff className="w-3 h-3 text-yellow-600" />
                <span className="text-xs text-yellow-700 font-medium">
                  Cached Data
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {filteredOperators.length} operators available in your area
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search operators or specialties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="distance">Sort by Distance</option>
              <option value="rating">Sort by Rating</option>
              <option value="availability">Sort by Availability</option>
            </select>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              {filters.map(filter => (
                <div key={filter.id}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  <select
                    value={selectedFilters[filter.id] || ''}
                    onChange={(e) => setSelectedFilters(prev => ({
                      ...prev,
                      [filter.id]: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                  >
                    <option value="">Any {filter.label}</option>
                    {filter.options.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operators List */}
        <div className="space-y-4">
          {filteredOperators.map(operator => (
            <OperatorCard key={operator.id} operator={operator} isOnline={isOnline} />
          ))}
          
          {filteredOperators.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No operators found
              </h3>
              <p className="text-sm text-gray-600">
                Try adjusting your search criteria or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function OperatorCard({ operator, isOnline }: { operator: any, isOnline: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-600">
                  {operator.name.split(' ').map((n: string) => n[0]).join('')}
                </span>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                operator.status === 'online' ? 'bg-green-400' : 
                operator.status === 'away' ? 'bg-yellow-400' : 'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">
                {operator.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <MapPin className="w-3 h-3" />
                <span>{operator.location}</span>
                <span className="mx-1">•</span>
                <span>{operator.distance}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{operator.rating}</span>
                <span className="mx-1">•</span>
                <span>{operator.reviews} reviews</span>
              </div>
            </div>
          </div>
          
          {!isOnline && (
            <WifiOff className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1 mb-3">
          {operator.specialties.map((specialty: string) => (
            <span
              key={specialty}
              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
            >
              {specialty}
            </span>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{operator.availability}</span>
          </div>
          <div>
            Response: {operator.responseTime}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button 
            className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
            disabled={!isOnline}
          >
            Contact Now
          </button>
          <button 
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
            disabled={!isOnline}
          >
            View Profile
          </button>
        </div>

        {!isOnline && (
          <p className="mt-2 text-xs text-yellow-600">
            Contact features available when online
          </p>
        )}
      </div>
    </div>
  )
}