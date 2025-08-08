/**
 * Company Cam Project Manager
 * Complete project management interface for Company Cam integration
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  companyCamApi,
  type CompanyCamProject,
  type CompanyCamPhoto,
  WOODWORK_TAGS
} from '@/lib/services/companycam-api';
import { offlinePhotoSync } from '@/lib/services/offline-photo-sync';
import { logger } from '@/lib/logging/simple-logger';
import {
  CameraIcon,
  FolderIcon,
  CloudArrowUpIcon,
  TagIcon,
  MapPinIcon,
  CalendarIcon,
  PhotoIcon,
  PlusIcon,
  RefreshIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface CompanyCamProjectManagerProps {
  initialProjectId?: string;
  onProjectSelect?: (project: CompanyCamProject) => void;
  onPhotoUploaded?: (photo: CompanyCamPhoto) => void;
  salesforceId?: string;
  estimateId?: string;
}

interface ProjectFormData {
  name: string;
  address: string;
  salesforceId?: string;
  estimateId?: string;
}

export function CompanyCamProjectManager({
  initialProjectId,
  onProjectSelect,
  onPhotoUploaded,
  salesforceId,
  estimateId
}: CompanyCamProjectManagerProps) {
  const [projects, setProjects] = useState<CompanyCamProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CompanyCamProject | null>(null);
  const [projectPhotos, setProjectPhotos] = useState<CompanyCamPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [photoFilter, setPhotoFilter] = useState<string>('all');
  const [syncStats, setSyncStats] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
    loadSyncStats();
  }, []);

  // Load specific project if provided
  useEffect(() => {
    if (initialProjectId) {
      loadProject(initialProjectId);
    }
  }, [initialProjectId]);

  // Periodic sync stats update
  useEffect(() => {
    const interval = setInterval(loadSyncStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const projectList = await companyCamApi.getProjects();
      setProjects(projectList);
    } catch (error) {
      logger.error('Failed to load projects', { error });
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    try {
      const project = await companyCamApi.getProject(projectId);
      if (project) {
        setSelectedProject(project);
        onProjectSelect?.(project);

        // Load project photos
        const photos = await companyCamApi.getPhotos(projectId);
        setProjectPhotos(photos);
      }
    } catch (error) {
      logger.error('Failed to load project', { error, projectId });
      toast.error('Failed to load project');
    }
  }, [onProjectSelect]);

  const loadSyncStats = useCallback(async () => {
    try {
      const stats = await offlinePhotoSync.getSyncStatistics();
      setSyncStats(stats);
    } catch (error) {
      logger.error('Failed to load sync stats', { error });
    }
  }, []);

  const createProject = async (data: ProjectFormData) => {
    try {
      setLoading(true);
      const newProject = await companyCamApi.createProject({
        ...data,
        salesforceId: data.salesforceId || salesforceId,
        estimateId: data.estimateId || estimateId
      });

      setProjects(prev => [newProject, ...prev]);
      setSelectedProject(newProject);
      onProjectSelect?.(newProject);
      setShowCreateForm(false);

      toast.success('Project created successfully');
    } catch (error) {
      logger.error('Failed to create project', { error });
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const uploadPhotos = async (files: File[]) => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    try {
      setUploading(true);
      const uploadPromises = files.map(async (file) => {
        try {
          // Check if online - if not, store offline
          if (!navigator.onLine) {
            const offlinePhoto = await offlinePhotoSync.storePhotoOffline(
              selectedProject.id,
              file,
              {
                tags: ['uploaded'],
                priority: 1,
                autoTag: true
              }
            );

            toast.info(`${file.name} queued for upload when online`);
            return offlinePhoto;
          } else {
            // Upload directly
            const uploadedPhoto = await companyCamApi.uploadPhoto(
              selectedProject.id,
              file,
              {
                autoTag: true,
                tags: ['uploaded']
              }
            );

            onPhotoUploaded?.(uploadedPhoto);
            return uploadedPhoto;
          }
        } catch (error) {
          logger.error('Failed to upload photo', { error, filename: file.name });
          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean);

      if (successfulUploads.length > 0) {
        toast.success(`Uploaded ${successfulUploads.length} photos`);
        // Reload project photos
        if (selectedProject) {
          const photos = await companyCamApi.getPhotos(selectedProject.id);
          setProjectPhotos(photos);
        }
      }

    } catch (error) {
      logger.error('Failed to upload photos', { error });
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      await offlinePhotoSync.triggerSync();
      toast.success('Sync completed');
      await loadSyncStats();
    } catch (error) {
      logger.error('Failed to sync', { error });
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      uploadPhotos(files);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      uploadPhotos(files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const getFilteredPhotos = () => {
    if (photoFilter === 'all') return projectPhotos;

    if (photoFilter === 'woodwork') {
      return projectPhotos.filter(photo =>
        Object.values(WOODWORK_TAGS).flat().some(tag =>
          photo.tags.includes(tag)
        )
      );
    }

    return projectPhotos.filter(photo => photo.tags.includes(photoFilter));
  };

  const categorizePhotos = () => {
    if (projectPhotos.length === 0) return null;
    return companyCamApi.categorizePhotos(projectPhotos);
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshIcon className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Cam Projects</h2>
          <p className="text-gray-600">Manage project photos and documentation</p>
        </div>

        <div className="flex space-x-3">
          {syncStats && (
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-1">
                <CloudArrowUpIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">{syncStats.pendingPhotos}</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">{syncStats.syncedPhotos}</span>
              </div>
              {syncStats.failedPhotos > 0 && (
                <div className="flex items-center space-x-1">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">{syncStats.failedPhotos}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>

          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Project Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => loadProject(project.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedProject?.id === project.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <FolderIcon className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPinIcon className="w-4 h-4 mr-1" />
                  <span className="truncate">{project.address}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <PhotoIcon className="w-4 h-4 mr-1" />
                    <span>{project.photos.length} photos</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : project.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Upload Area */}
      {selectedProject && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Photos for {selectedProject.name}</h3>
            <div className="flex space-x-2">
              <select
                value={photoFilter}
                onChange={(e) => setPhotoFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Photos</option>
                <option value="before">Before</option>
                <option value="progress">Progress</option>
                <option value="after">After</option>
                <option value="woodwork">Woodwork</option>
                {Object.keys(WOODWORK_TAGS).map(category => (
                  <option key={category} value={category.toLowerCase()}>
                    {category.charAt(0) + category.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>

              <div className="flex">
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-2 border-l border-t border-b rounded-l-lg ${
                    view === 'grid'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-2 border rounded-r-lg ${
                    view === 'list'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          >
            <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Upload Photos</p>
            <p className="text-gray-600 mb-4">
              Drag and drop photos here, or click to select files
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Select Photos'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Photos Display */}
          <div className={`${view === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-4'
          }`}>
            {getFilteredPhotos().map((photo) => (
              <div
                key={photo.id}
                className={`${view === 'grid'
                  ? 'aspect-square bg-gray-100 rounded-lg overflow-hidden'
                  : 'flex items-center space-x-4 p-4 bg-gray-50 rounded-lg'
                }`}
              >
                {view === 'grid' ? (
                  <>
                    <img
                      src={photo.uri || photo.offline_path}
                      alt="Project photo"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-end">
                      <div className="p-3 text-white opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex flex-wrap gap-1">
                          {photo.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-blue-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {photo.upload_status && photo.upload_status !== 'completed' && (
                          <div className="mt-2 flex items-center">
                            {photo.upload_status === 'pending' && (
                              <CloudArrowUpIcon className="w-4 h-4 mr-1" />
                            )}
                            {photo.upload_status === 'failed' && (
                              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            )}
                            <span className="text-xs">{photo.upload_status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={photo.uri || photo.offline_path}
                      alt="Project photo"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          Photo {photo.id.slice(-8)}
                        </span>
                        {photo.upload_status && photo.upload_status !== 'completed' && (
                          <span className={`px-2 py-1 text-xs rounded ${
                            photo.upload_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : photo.upload_status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {photo.upload_status}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {photo.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(photo.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {getFilteredPhotos().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <PhotoIcon className="w-12 h-12 mx-auto mb-4" />
              <p>No photos found for the selected filter</p>
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateForm && (
        <CreateProjectModal
          onClose={() => setShowCreateForm(false)}
          onCreate={createProject}
          defaultSalesforceId={salesforceId}
          defaultEstimateId={estimateId}
        />
      )}
    </div>
  );
}

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (data: ProjectFormData) => void;
  defaultSalesforceId?: string;
  defaultEstimateId?: string;
}

function CreateProjectModal({ onClose, onCreate, defaultSalesforceId, defaultEstimateId }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    address: '',
    salesforceId: defaultSalesforceId || '',
    estimateId: defaultEstimateId || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.address.trim()) {
      onCreate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Project</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salesforce ID
            </label>
            <input
              type="text"
              value={formData.salesforceId}
              onChange={(e) => setFormData(prev => ({ ...prev, salesforceId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional Salesforce ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimate ID
            </label>
            <input
              type="text"
              value={formData.estimateId}
              onChange={(e) => setFormData(prev => ({ ...prev, estimateId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional Estimate ID"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
