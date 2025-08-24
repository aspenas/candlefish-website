'use client'

import { useState, useEffect } from 'react'
import { Download, FileText, Clock, CheckCircle, AlertCircle, Search, Filter, WifiOff } from 'lucide-react'
import { usePWA } from '@/components/providers/PWAProvider'

interface Guide {
  id: string
  title: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  estimatedTime: string
  downloadSize: string
  isDownloaded: boolean
  lastUpdated: string
  steps: number
  mediaCount: number
}

const guides: Guide[] = [
  {
    id: '1',
    title: 'IoT Sensor Installation',
    description: 'Complete guide for installing and configuring IoT sensors in industrial environments',
    category: 'Hardware',
    difficulty: 'Intermediate',
    estimatedTime: '45 min',
    downloadSize: '12 MB',
    isDownloaded: true,
    lastUpdated: '2 days ago',
    steps: 8,
    mediaCount: 15
  },
  {
    id: '2', 
    title: 'Smart Building Integration',
    description: 'Step-by-step process for integrating Candlefish AI with existing building management systems',
    category: 'Integration',
    difficulty: 'Advanced',
    estimatedTime: '2 hours',
    downloadSize: '28 MB',
    isDownloaded: true,
    lastUpdated: '5 days ago',
    steps: 12,
    mediaCount: 23
  },
  {
    id: '3',
    title: 'Predictive Maintenance Setup',
    description: 'Configure predictive maintenance algorithms for manufacturing equipment',
    category: 'Software',
    difficulty: 'Intermediate',
    estimatedTime: '1.5 hours',
    downloadSize: '18 MB',
    isDownloaded: false,
    lastUpdated: '1 week ago',
    steps: 10,
    mediaCount: 19
  },
  {
    id: '4',
    title: 'Safety Protocol Implementation',
    description: 'Essential safety protocols for field operators working with AI systems',
    category: 'Safety',
    difficulty: 'Beginner',
    estimatedTime: '30 min',
    downloadSize: '8 MB',
    isDownloaded: true,
    lastUpdated: '3 days ago',
    steps: 6,
    mediaCount: 12
  }
]

const categories = ['All', 'Hardware', 'Integration', 'Software', 'Safety']
const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced']

export function MobileImplementationGuides() {
  const { isOnline } = usePWA()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [showFilters, setShowFilters] = useState(false)

  const filteredGuides = guides.filter(guide => {
    if (searchTerm && !guide.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !guide.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    if (selectedCategory !== 'All' && guide.category !== selectedCategory) {
      return false
    }
    
    if (selectedDifficulty !== 'All' && guide.difficulty !== selectedDifficulty) {
      return false
    }
    
    // Show offline guides first when offline
    if (!isOnline) {
      return guide.isDownloaded
    }
    
    return true
  })

  const downloadedCount = guides.filter(g => g.isDownloaded).length
  const totalSize = guides
    .filter(g => g.isDownloaded)
    .reduce((sum, g) => sum + parseInt(g.downloadSize), 0)

  return (
    <section className="py-8 bg-gray-50 min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Implementation Guides
            </h2>
            {!isOnline && (
              <div className="flex items-center gap-2 px-2 py-1 bg-yellow-100 rounded-full">
                <WifiOff className="w-3 h-3 text-yellow-600" />
                <span className="text-xs text-yellow-700 font-medium">
                  Offline Mode
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{filteredGuides.length} guides available</span>
            <span>•</span>
            <span>{downloadedCount} downloaded ({totalSize} MB)</span>
          </div>

          {!isOnline && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Offline Mode:</strong> Only showing downloaded guides. 
                Connect to internet to access all guides.
              </p>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search implementation guides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">
              Filters
              {(selectedCategory !== 'All' || selectedDifficulty !== 'All') && 
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  Active
                </span>
              }
            </span>
          </button>

          {/* Filter Options */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                >
                  {difficulties.map(difficulty => (
                    <option key={difficulty} value={difficulty}>{difficulty}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Guides List */}
        <div className="space-y-4">
          {filteredGuides.map(guide => (
            <GuideCard key={guide.id} guide={guide} isOnline={isOnline} />
          ))}
          
          {filteredGuides.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No guides found
              </h3>
              <p className="text-sm text-gray-600">
                {!isOnline 
                  ? 'Download guides while online to access them offline'
                  : 'Try adjusting your search criteria or filters'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function GuideCard({ guide, isOnline }: { guide: Guide, isOnline: boolean }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!isOnline) return
    
    setIsDownloading(true)
    // Simulate download
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsDownloading(false)
    guide.isDownloaded = true
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700'
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'Advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base mb-1">
              {guide.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {guide.description}
            </p>
          </div>
          
          {guide.isDownloaded ? (
            <div className="flex items-center gap-1 text-green-600 ml-2">
              <CheckCircle className="w-4 h-4" />
              {!isOnline && <WifiOff className="w-3 h-3" />}
            </div>
          ) : !isOnline ? (
            <AlertCircle className="w-4 h-4 text-gray-400 ml-2" />
          ) : null}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span className={`px-2 py-1 rounded-full font-medium ${getDifficultyColor(guide.difficulty)}`}>
            {guide.difficulty}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
            {guide.category}
          </span>
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{guide.estimatedTime}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>{guide.steps} steps</span>
          <span>{guide.mediaCount} images/videos</span>
          <span>Updated {guide.lastUpdated}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {guide.isDownloaded ? (
            <button className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors">
              Open Guide
            </button>
          ) : isOnline ? (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 bg-gray-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 active:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download ({guide.downloadSize})
                </>
              )}
            </button>
          ) : (
            <button 
              className="flex-1 bg-gray-300 text-gray-500 py-2.5 px-4 rounded-lg text-sm font-medium cursor-not-allowed"
              disabled
            >
              Download when online
            </button>
          )}

          <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors">
            Preview
          </button>
        </div>
      </div>
    </div>
  )
}