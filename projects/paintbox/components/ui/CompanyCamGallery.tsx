'use client';

import React, { useState, useEffect } from 'react';
import { Camera, X, Plus, Image as ImageIcon, Tag, Edit2, Loader2 } from 'lucide-react';
import { animated, useSpring, useTransition } from '@react-spring/web';
import { companyCamApi, type CompanyCamProject, type CompanyCamPhoto } from '@/lib/services/companycam-api';
import { cn } from '@/lib/utils';

interface CompanyCamGalleryProps {
  projectId?: string;
  onPhotosChange?: (photos: CompanyCamPhoto[]) => void;
  className?: string;
}

export const CompanyCamGallery: React.FC<CompanyCamGalleryProps> = ({
  projectId,
  onPhotosChange,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState<CompanyCamProject | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<CompanyCamPhoto | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const gallerySpring = useSpring({
    opacity: isLoading ? 0.5 : 1,
    transform: isLoading ? 'scale(0.98)' : 'scale(1)',
    config: { tension: 300, friction: 25 }
  });

  const transitions = useTransition(project?.photos || [], {
    from: { opacity: 0, scale: 0.8 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.8 },
    config: { tension: 200, friction: 20 }
  });

  const modalSpring = useSpring({
    opacity: selectedPhoto ? 1 : 0,
    transform: selectedPhoto ? 'scale(1)' : 'scale(0.9)',
    config: { tension: 300, friction: 25 }
  });

  useEffect(() => {
    if (projectId) {
      loadProject();
    } else {
      loadRecentProjects();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const projectData = await companyCamApi.getProject(projectId);
      if (projectData) {
        setProject(projectData);
        onPhotosChange?.(projectData.photos);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentProjects = async () => {
    setIsLoading(true);
    try {
      const projects = await companyCamApi.getProjects();
      if (projects.length > 0) {
        setProject(projects[0]); // Use most recent project
        onPhotosChange?.(projects[0].photos);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setShowUpload(false);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress((i / files.length) * 100);

      try {
        const tags = ['exterior', 'before', new Date().toLocaleDateString()];
        const photo = await companyCamApi.uploadPhoto(projectId || 'new', file, tags);

        // Add to current project
        if (project) {
          const updatedProject = {
            ...project,
            photos: [...project.photos, photo]
          };
          setProject(updatedProject);
          onPhotosChange?.(updatedProject.photos);
        }
      } catch (error) {
        console.error('Failed to upload photo:', error);
      }
    }

    setUploadProgress(100);
    setTimeout(() => setUploadProgress(0), 1000);
  };

  const addTag = async (photoId: string, tag: string) => {
    if (!project) return;

    await companyCamApi.addTags(photoId, [tag]);

    // Update local state
    const updatedPhotos = project.photos.map(photo =>
      photo.id === photoId
        ? { ...photo, tags: [...photo.tags, tag] }
        : photo
    );

    setProject({ ...project, photos: updatedPhotos });
    onPhotosChange?.(updatedPhotos);
  };

  const categorizedPhotos = project ? companyCamApi.categorizePhotos(project.photos) : null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-paintbox-text flex items-center gap-2">
            <Camera className="w-5 h-5 text-paintbox-primary" />
            Project Photos
          </h3>
          {project && (
            <p className="text-sm text-paintbox-text-muted">{project.name}</p>
          )}
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="paintbox-btn paintbox-btn-secondary"
        >
          <Plus className="w-4 h-4" />
          Add Photos
        </button>
      </div>

      <animated.div style={gallerySpring}>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-paintbox-primary animate-spin mx-auto mb-2" />
            <p className="text-paintbox-text-muted">Loading photos...</p>
          </div>
        ) : !project || project.photos.length === 0 ? (
          <div className="paintbox-card p-8 text-center">
            <ImageIcon className="w-12 h-12 text-paintbox-primary/30 mx-auto mb-3" />
            <p className="text-paintbox-text-muted mb-4">No photos yet</p>
            <button
              onClick={() => setShowUpload(true)}
              className="paintbox-btn paintbox-btn-primary mx-auto"
            >
              Upload First Photo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {categorizedPhotos && (
              <>
                {categorizedPhotos.before.length > 0 && (
                  <PhotoSection
                    title="Before"
                    photos={categorizedPhotos.before}
                    onPhotoClick={setSelectedPhoto}
                    transitions={transitions}
                  />
                )}

                {categorizedPhotos.progress.length > 0 && (
                  <PhotoSection
                    title="Progress"
                    photos={categorizedPhotos.progress}
                    onPhotoClick={setSelectedPhoto}
                    transitions={transitions}
                  />
                )}

                {categorizedPhotos.after.length > 0 && (
                  <PhotoSection
                    title="Completed"
                    photos={categorizedPhotos.after}
                    onPhotoClick={setSelectedPhoto}
                    transitions={transitions}
                  />
                )}

                {categorizedPhotos.other.length > 0 && (
                  <PhotoSection
                    title="Other"
                    photos={categorizedPhotos.other}
                    onPhotoClick={setSelectedPhoto}
                    transitions={transitions}
                  />
                )}
              </>
            )}
          </div>
        )}
      </animated.div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-paintbox-text">Upload Photos</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="p-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-paintbox-border rounded-lg p-8 text-center">
              <Camera className="w-12 h-12 text-paintbox-primary/50 mx-auto mb-3" />
              <p className="text-paintbox-text-muted mb-4">
                Drag photos here or click to browse
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="paintbox-btn paintbox-btn-primary cursor-pointer"
              >
                Choose Photos
              </label>
            </div>

            {uploadProgress > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-paintbox-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-paintbox-primary to-paintbox-accent transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-paintbox-text-muted mt-2 text-center">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <animated.div
            style={modalSpring}
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedPhoto.uri}
                alt="Project photo"
                className="w-full h-auto"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {selectedPhoto.annotations.map((annotation, index) => (
                <div
                  key={index}
                  className="absolute bg-red-600 text-white text-xs px-2 py-1 rounded pointer-events-none"
                  style={{ left: annotation.x, top: annotation.y }}
                >
                  {annotation.text}
                </div>
              ))}
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-paintbox-primary" />
                <div className="flex flex-wrap gap-2">
                  {selectedPhoto.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-paintbox-primary/10 text-paintbox-primary text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  <button
                    onClick={() => {
                      const tag = prompt('Add tag:');
                      if (tag) addTag(selectedPhoto.id, tag);
                    }}
                    className="px-2 py-1 border border-paintbox-border text-paintbox-text-muted text-sm rounded-full hover:bg-paintbox-primary/10 transition-colors"
                  >
                    <Plus className="w-3 h-3 inline" /> Add
                  </button>
                </div>
              </div>

              <p className="text-sm text-paintbox-text-muted">
                Uploaded {new Date(selectedPhoto.created_at).toLocaleDateString()}
              </p>
            </div>
          </animated.div>
        </div>
      )}
    </div>
  );
};

interface PhotoSectionProps {
  title: string;
  photos: CompanyCamPhoto[];
  onPhotoClick: (photo: CompanyCamPhoto) => void;
  transitions: any;
}

const PhotoSection: React.FC<PhotoSectionProps> = ({ title, photos, onPhotoClick, transitions }) => (
  <div>
    <h4 className="text-md font-medium text-paintbox-text mb-3">{title} Photos</h4>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {transitions((style: any, photo: CompanyCamPhoto) => (
        photos.includes(photo) && (
          <animated.div
            style={style}
            className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
            onClick={() => onPhotoClick(photo)}
          >
            <img
              src={photo.uri}
              alt="Project photo"
              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                {photo.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-white/90 text-gray-800 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {photo.tags.length > 2 && (
                  <span className="text-xs bg-white/90 text-gray-800 px-1.5 py-0.5 rounded">
                    +{photo.tags.length - 2}
                  </span>
                )}
              </div>
            </div>
            {photo.annotations.length > 0 && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {photo.annotations.length}
              </div>
            )}
          </animated.div>
        )
      ))}
    </div>
  </div>
);
