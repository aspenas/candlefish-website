import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useSubscription } from '@apollo/client'
import {
  PhotoIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ViewColumnsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import { GET_PROJECTS, GET_PROJECT } from '@/graphql/queries'
import { UPLOAD_PROJECT_PHOTO } from '@/graphql/mutations'
import { PROJECT_PHOTO_UPLOADED, PROJECT_TIMELINE_UPDATED } from '@/graphql/subscriptions'
import { Project, ProjectFilter, ProjectStatus } from '@/types'
import { PhotoGrid } from './PhotoGrid'
import { ProjectTimeline } from './ProjectTimeline'
import { SearchInput } from '../common/SearchInput'
import { FilterDropdown } from '../common/FilterDropdown'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorMessage } from '../common/ErrorMessage'

interface ProjectGalleryProps {
  customerId?: string
  className?: string
}

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({
  customerId,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // Build filter object
  const filter: ProjectFilter = {
    ...(customerId && { customerId }),
    ...(searchTerm && { search: searchTerm }),
    ...(statusFilter && { status: statusFilter })
  }

  // GraphQL queries
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
  } = useQuery(GET_PROJECTS, {
    variables: {
      filter,
      limit: 50
    },
    errorPolicy: 'all'
  })

  const {
    data: selectedProjectData,
    loading: projectLoading
  } = useQuery(GET_PROJECT, {
    variables: { id: selectedProject },
    skip: !selectedProject,
    errorPolicy: 'all'
  })

  // Mutations
  const [uploadPhoto] = useMutation(UPLOAD_PROJECT_PHOTO, {
    onCompleted: () => {
      setUploadingPhotos(false)
      refetchProjects()
    },
    onError: (error) => {
      console.error('Photo upload error:', error)
      setUploadingPhotos(false)
    }
  })

  // Subscriptions for real-time updates
  useSubscription(PROJECT_PHOTO_UPLOADED, {
    variables: { projectId: selectedProject },
    skip: !selectedProject,
    onData: ({ data }) => {
      if (data.data?.projectPhotoUploaded) {
        refetchProjects()
      }
    }
  })

  useSubscription(PROJECT_TIMELINE_UPDATED, {
    variables: { projectId: selectedProject },
    skip: !selectedProject,
    onData: ({ data }) => {
      if (data.data?.projectTimelineUpdated) {
        refetchProjects()
      }
    }
  })

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as ProjectStatus | '')
  }

  const handlePhotoUpload = useCallback(async (files: FileList, projectId: string) => {
    if (!files.length) return

    setUploadingPhotos(true)

    try {
      const uploadPromises = Array.from(files).map(file =>
        uploadPhoto({
          variables: {
            projectId,
            file,
            caption: `Uploaded ${new Date().toLocaleDateString()}`
          }
        })
      )

      await Promise.all(uploadPromises)
    } catch (error) {
      console.error('Failed to upload photos:', error)
    }
  }, [uploadPhoto])

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId === selectedProject ? null : projectId)
  }

  const projects = projectsData?.projects.edges.map(edge => edge.node) || []
  const currentProject = selectedProjectData?.project
  const hasError = projectsError
  const isLoading = projectsLoading && !projectsData

  if (hasError && !projectsData) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorMessage
          title="Failed to load projects"
          message={projectsError?.message || 'Unable to fetch project data'}
          onRetry={() => refetchProjects()}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Gallery</h1>
          <p className="text-gray-600 mt-1">
            View Company Cam photos and project timelines
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 ${viewMode === 'timeline' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ViewColumnsIcon className="h-5 w-5" />
            </button>
          </div>

          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search projects by name or description..."
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-4">
            <FilterDropdown
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Planning', value: ProjectStatus.PLANNING },
                { label: 'In Progress', value: ProjectStatus.IN_PROGRESS },
                { label: 'Review', value: ProjectStatus.REVIEW },
                { label: 'Completed', value: ProjectStatus.COMPLETED },
                { label: 'On Hold', value: ProjectStatus.ON_HOLD },
                { label: 'Cancelled', value: ProjectStatus.CANCELLED }
              ]}
              value={statusFilter}
              onChange={handleStatusFilter}
              placeholder="Filter by status"
            />
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Projects</h3>
              <p className="text-sm text-gray-600 mt-1">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>

            {isLoading ? (
              <div className="p-6 text-center">
                <LoadingSpinner />
                <p className="text-gray-600 mt-2">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-center">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mt-4">No projects found</h3>
                <p className="text-gray-600 mt-2">
                  {searchTerm || statusFilter
                    ? 'Try adjusting your search criteria.'
                    : 'Create your first project to get started.'}
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      selectedProject === project.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {project.name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {project.description || 'No description'}
                        </p>
                        <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            project.status === ProjectStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                            project.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                            project.status === ProjectStatus.ON_HOLD ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status.replace('_', ' ')}
                          </span>
                          <span>{project.companyCamPhotos?.length || 0} photos</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {selectedProject && currentProject ? (
            <div className="space-y-6">
              {/* Project Header */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{currentProject.name}</h2>
                    <p className="text-gray-600 mt-1">{currentProject.description}</p>
                    <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Created {new Date(currentProject.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Updated {new Date(currentProject.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    currentProject.status === ProjectStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                    currentProject.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                    currentProject.status === ProjectStatus.ON_HOLD ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentProject.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Photo Grid or Timeline */}
              {viewMode === 'grid' ? (
                <PhotoGrid
                  photos={currentProject.companyCamPhotos || []}
                  onPhotoUpload={(files) => handlePhotoUpload(files, currentProject.id)}
                  uploading={uploadingPhotos}
                />
              ) : (
                <ProjectTimeline
                  entries={currentProject.timeline || []}
                  className="bg-white rounded-lg shadow border"
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border p-12 text-center">
              <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mt-4">Select a project</h3>
              <p className="text-gray-600 mt-2">
                Choose a project from the list to view photos and timeline
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
