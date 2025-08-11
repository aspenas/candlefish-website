/**
 * CompanyCam API Service
 * Production-ready photo management for painting projects with offline support
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@/lib/logging/simple-logger';
import { getCacheInstance } from '@/lib/cache/cache-service';
import { openDB, IDBPDatabase } from 'idb';
import {
  ExternalServiceError,
  AuthenticationError,
  ServiceUnavailableError,
  companyCamCircuitBreaker
} from '@/lib/middleware/error-handler';

// Types and interfaces
export interface CompanyCamProject {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  photos: CompanyCamPhoto[];
  metadata?: {
    salesforceId?: string;
    estimateId?: string;
    totalPhotos?: number;
    lastPhotoUpload?: string;
  };
}

export interface CompanyCamPhoto {
  id: string;
  uri: string;
  thumbnail_uri?: string;
  created_at: string;
  updated_at?: string;
  tags: string[];
  annotations: PhotoAnnotation[];
  metadata?: {
    size?: number;
    format?: string;
    dimensions?: { width: number; height: number };
    location?: { lat: number; lng: number };
    camera?: string;
    uploader?: string;
  };
  upload_status?: 'pending' | 'uploading' | 'completed' | 'failed';
  offline_path?: string; // Local storage path for offline photos
}

export interface PhotoAnnotation {
  id?: string;
  text: string;
  x: number;
  y: number;
  created_at?: string;
  created_by?: string;
}

export interface CompanyCamUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CompanyCamWebhookEvent {
  event_type: 'photo_uploaded' | 'project_created' | 'annotation_added' | 'tag_added';
  project_id: string;
  photo_id?: string;
  timestamp: string;
  data: any;
}

// Woodwork-specific tagging system
const WOODWORK_TAGS = {
  TRIM: ['trim', 'baseboard', 'crown-molding', 'window-trim', 'door-trim'],
  DOORS: ['door', 'interior-door', 'exterior-door', 'french-door', 'closet-door'],
  CABINETS: ['cabinet', 'kitchen-cabinet', 'bathroom-cabinet', 'built-in'],
  WINDOWS: ['window', 'window-frame', 'window-sill', 'shutters'],
  STAIRS: ['stairs', 'stair-railing', 'handrail', 'newel-post', 'balusters'],
  PANELING: ['wainscoting', 'panel', 'board-and-batten', 'beadboard'],
  EXTERIOR: ['siding', 'deck', 'fence', 'pergola', 'outdoor-trim'],
  OTHER: ['miscellaneous', 'custom-woodwork', 'repair']
};

class CompanyCamApiService {
  private client: AxiosInstance | null = null;
  private apiToken: string | null = null;
  private baseURL = 'https://api.companycam.com/v2';
  private cache = getCacheInstance();
  private db: IDBPDatabase | null = null;
  private isInitialized = false;
  private retryCount = 3;
  private retryDelay = 1000; // ms

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Initialize offline database
      await this.initOfflineDB();

      // Get API token from environment variables (production mode)
      this.apiToken = process.env.COMPANYCAM_API_TOKEN || process.env.COMPANYCAM_API_KEY;

      // Use production base URL and company ID if available
      if (process.env.COMPANYCAM_COMPANY_ID) {
        this.baseURL = `https://api.companycam.com/v2/companies/${process.env.COMPANYCAM_COMPANY_ID}`;
      }

      if (this.apiToken) {
        this.client = axios.create({
          baseURL: this.baseURL,
          headers: {
            'Authorization': `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Paintbox-Production/1.0',
            'X-Company-ID': process.env.COMPANYCAM_COMPANY_ID || '179901'
          },
          timeout: 30000, // 30 second timeout
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
          (config) => {
            logger.info('CompanyCam API Request', {
              method: config.method,
              url: config.url,
              params: config.params
            });
            return config;
          },
          (error) => {
            logger.error('CompanyCam API Request Error', { error });
            return Promise.reject(error);
          }
        );

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
          (response) => {
            logger.debug('CompanyCam API Response', {
              status: response.status,
              url: response.config.url
            });
            return response;
          },
          (error: AxiosError) => {
            logger.error('CompanyCam API Response Error', {
              status: error.response?.status,
              message: error.message,
              url: error.config?.url
            });
            return Promise.reject(error);
          }
        );

        this.isInitialized = true;
        logger.info('CompanyCam API service initialized successfully');
      } else {
        logger.warn('CompanyCam API token not available - running in offline mode');
      }
    } catch (error) {
      logger.error('Failed to initialize CompanyCam API service', { error });
    }
  }

  private async initOfflineDB(): Promise<void> {
    try {
      this.db = await openDB('companycam-offline', 1, {
        upgrade(db) {
          // Projects store
          if (!db.objectStoreNames.contains('projects')) {
            const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
            projectStore.createIndex('status', 'status');
            projectStore.createIndex('created_at', 'created_at');
          }

          // Photos store
          if (!db.objectStoreNames.contains('photos')) {
            const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
            photoStore.createIndex('project_id', 'project_id');
            photoStore.createIndex('upload_status', 'upload_status');
            photoStore.createIndex('created_at', 'created_at');
          }

          // Pending uploads store
          if (!db.objectStoreNames.contains('pending_uploads')) {
            const uploadStore = db.createObjectStore('pending_uploads', { keyPath: 'id' });
            uploadStore.createIndex('project_id', 'project_id');
            uploadStore.createIndex('created_at', 'created_at');
          }
        },
      });
    } catch (error) {
      logger.error('Failed to initialize offline database', { error });
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    return companyCamCircuitBreaker.execute(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.retryCount; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          logger.warn(`CompanyCam ${context} attempt ${attempt} failed`, { error, attempt });

          // Check for authentication errors
          if ((error as any).response?.status === 401) {
            throw new AuthenticationError('CompanyCam API authentication failed', {
              context,
              statusCode: 401,
            });
          }

          if (attempt < this.retryCount) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
          }
        }
      }

      // Wrap as external service error
      throw new ExternalServiceError('CompanyCam', lastError?.message || 'Unknown error', {
        context,
        attempts: this.retryCount,
      });
    }, 'CompanyCam');
  }

  // Project Management
  async getProjects(useCache = true): Promise<CompanyCamProject[]> {
    const cacheKey = 'companycam:projects';

    if (useCache && this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    if (!this.isInitialized || !this.client) {
      // Return offline projects
      return this.getOfflineProjects();
    }

    try {
      const response = await this.withRetry(
        () => this.client!.get('/projects'),
        'Get projects'
      );

      const projects: CompanyCamProject[] = response.data.data || [];

      // Cache the results
      if (this.cache) {
        await this.cache.set(cacheKey, JSON.stringify(projects), 300); // 5 min cache
      }

      // Store offline for future use
      await this.storeOfflineProjects(projects);

      return projects;
    } catch (error) {
      logger.error('Failed to fetch projects from CompanyCam API', { error });
      // Fallback to offline data
      return this.getOfflineProjects();
    }
  }

  async getProject(projectId: string): Promise<CompanyCamProject | null> {
    if (!this.isInitialized || !this.client) {
      return this.getOfflineProject(projectId);
    }

    try {
      const response = await this.withRetry(
        () => this.client!.get(`/projects/${projectId}`),
        `Get project ${projectId}`
      );

      const project: CompanyCamProject = response.data;

      // Store offline
      await this.storeOfflineProject(project);

      return project;
    } catch (error) {
      logger.error('Failed to fetch project from CompanyCam API', { error, projectId });
      return this.getOfflineProject(projectId);
    }
  }

  async createProject(data: {
    name: string;
    address: string;
    salesforceId?: string;
    estimateId?: string;
  }): Promise<CompanyCamProject> {
    const projectData = {
      name: data.name,
      address: data.address,
      metadata: {
        salesforceId: data.salesforceId,
        estimateId: data.estimateId
      }
    };

    if (!this.isInitialized || !this.client) {
      // Create offline project
      const offlineProject: CompanyCamProject = {
        id: `offline_${Date.now()}`,
        name: data.name,
        address: data.address,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        photos: [],
        metadata: projectData.metadata
      };

      await this.storeOfflineProject(offlineProject);
      return offlineProject;
    }

    try {
      const response = await this.withRetry(
        () => this.client!.post('/projects', projectData),
        'Create project'
      );

      const project: CompanyCamProject = response.data;
      await this.storeOfflineProject(project);

      return project;
    } catch (error) {
      logger.error('Failed to create project', { error, projectData });
      throw error;
    }
  }

  // Photo Management
  async uploadPhoto(
    projectId: string,
    file: File,
    options?: {
      tags?: string[];
      description?: string;
      autoTag?: boolean;
    }
  ): Promise<CompanyCamPhoto> {
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Auto-detect woodwork tags if enabled
    let tags = options?.tags || [];
    if (options?.autoTag) {
      tags = [...tags, ...this.detectWoodworkTags(file.name, options?.description)];
    }

    const photoData: CompanyCamPhoto = {
      id: photoId,
      uri: '',
      created_at: new Date().toISOString(),
      tags,
      annotations: [],
      upload_status: 'pending',
      metadata: {
        size: file.size,
        format: file.type,
        uploader: 'paintbox-app'
      }
    };

    // Store offline first
    await this.storeOfflinePhoto(projectId, photoData, file);

    if (!this.isInitialized || !this.client) {
      // Queue for upload when online
      await this.queuePhotoUpload(projectId, photoData, file);
      return photoData;
    }

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('tags', tags.join(','));
      if (options?.description) {
        formData.append('description', options.description);
      }

      const response = await this.withRetry(
        () => this.client!.post(`/projects/${projectId}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }),
        `Upload photo to project ${projectId}`
      );

      const uploadedPhoto: CompanyCamPhoto = {
        ...response.data,
        upload_status: 'completed'
      };

      // Update offline storage
      await this.updateOfflinePhoto(uploadedPhoto);

      return uploadedPhoto;
    } catch (error) {
      logger.error('Failed to upload photo', { error, projectId });

      // Mark as failed but keep in offline storage
      photoData.upload_status = 'failed';
      await this.updateOfflinePhoto(photoData);

      throw error;
    }
  }

  async getPhotos(projectId: string): Promise<CompanyCamPhoto[]> {
    if (!this.isInitialized || !this.client) {
      return this.getOfflinePhotos(projectId);
    }

    try {
      const response = await this.withRetry(
        () => this.client!.get(`/projects/${projectId}/photos`),
        `Get photos for project ${projectId}`
      );

      const photos: CompanyCamPhoto[] = response.data.data || [];

      // Store offline
      for (const photo of photos) {
        await this.storeOfflinePhoto(projectId, photo);
      }

      return photos;
    } catch (error) {
      logger.error('Failed to fetch photos', { error, projectId });
      return this.getOfflinePhotos(projectId);
    }
  }

  // Annotation Management
  async addAnnotation(
    photoId: string,
    annotation: Omit<PhotoAnnotation, 'id' | 'created_at'>
  ): Promise<PhotoAnnotation> {
    const fullAnnotation: PhotoAnnotation = {
      id: `ann_${Date.now()}`,
      ...annotation,
      created_at: new Date().toISOString(),
      created_by: 'paintbox-user'
    };

    if (!this.isInitialized || !this.client) {
      // Store offline
      await this.storeOfflineAnnotation(photoId, fullAnnotation);
      return fullAnnotation;
    }

    try {
      const response = await this.withRetry(
        () => this.client!.post(`/photos/${photoId}/annotations`, fullAnnotation),
        `Add annotation to photo ${photoId}`
      );

      const savedAnnotation: PhotoAnnotation = response.data;
      await this.storeOfflineAnnotation(photoId, savedAnnotation);

      return savedAnnotation;
    } catch (error) {
      logger.error('Failed to add annotation', { error, photoId });
      // Store offline as fallback
      await this.storeOfflineAnnotation(photoId, fullAnnotation);
      return fullAnnotation;
    }
  }

  async addTags(photoId: string, tags: string[]): Promise<void> {
    if (!this.isInitialized || !this.client) {
      await this.updateOfflinePhotoTags(photoId, tags);
      return;
    }

    try {
      await this.withRetry(
        () => this.client!.post(`/photos/${photoId}/tags`, { tags }),
        `Add tags to photo ${photoId}`
      );

      await this.updateOfflinePhotoTags(photoId, tags);
    } catch (error) {
      logger.error('Failed to add tags', { error, photoId, tags });
      // Store offline as fallback
      await this.updateOfflinePhotoTags(photoId, tags);
      throw error;
    }
  }

  // Woodwork Detection
  private detectWoodworkTags(filename: string, description?: string): string[] {
    const content = `${filename} ${description || ''}`.toLowerCase();
    const detectedTags: string[] = [];

    // Check each category
    Object.entries(WOODWORK_TAGS).forEach(([category, tags]) => {
      const categoryMatch = tags.some(tag =>
        content.includes(tag) ||
        content.includes(tag.replace('-', ' '))
      );

      if (categoryMatch) {
        detectedTags.push(category.toLowerCase());
        // Add specific tags that match
        tags.forEach(tag => {
          if (content.includes(tag) || content.includes(tag.replace('-', ' '))) {
            detectedTags.push(tag);
          }
        });
      }
    });

    // Add phase tags based on common patterns
    if (content.includes('before') || content.includes('initial')) {
      detectedTags.push('before');
    }
    if (content.includes('progress') || content.includes('during') || content.includes('work')) {
      detectedTags.push('progress');
    }
    if (content.includes('after') || content.includes('completed') || content.includes('finished')) {
      detectedTags.push('after');
    }

    return [...new Set(detectedTags)]; // Remove duplicates
  }

  // Photo Categorization
  categorizePhotos(photos: CompanyCamPhoto[]): {
    before: CompanyCamPhoto[];
    progress: CompanyCamPhoto[];
    after: CompanyCamPhoto[];
    woodwork: { [key: string]: CompanyCamPhoto[] };
    other: CompanyCamPhoto[];
  } {
    const categorized = {
      before: [] as CompanyCamPhoto[],
      progress: [] as CompanyCamPhoto[],
      after: [] as CompanyCamPhoto[],
      woodwork: {} as { [key: string]: CompanyCamPhoto[] },
      other: [] as CompanyCamPhoto[]
    };

    // Initialize woodwork categories
    Object.keys(WOODWORK_TAGS).forEach(category => {
      categorized.woodwork[category.toLowerCase()] = [];
    });

    photos.forEach(photo => {
      // Phase categorization
      if (photo.tags.some(tag => ['before', 'initial'].includes(tag))) {
        categorized.before.push(photo);
      } else if (photo.tags.some(tag => ['progress', 'during', 'work'].includes(tag))) {
        categorized.progress.push(photo);
      } else if (photo.tags.some(tag => ['after', 'completed', 'finished'].includes(tag))) {
        categorized.after.push(photo);
      }

      // Woodwork categorization
      let categorizedInWoodwork = false;
      Object.entries(WOODWORK_TAGS).forEach(([category, tags]) => {
        if (photo.tags.some(tag => tags.includes(tag) || tag === category.toLowerCase())) {
          categorized.woodwork[category.toLowerCase()].push(photo);
          categorizedInWoodwork = true;
        }
      });

      // If not categorized elsewhere, put in other
      if (!categorizedInWoodwork &&
          !categorized.before.includes(photo) &&
          !categorized.progress.includes(photo) &&
          !categorized.after.includes(photo)) {
        categorized.other.push(photo);
      }
    });

    return categorized;
  }

  // Offline Storage Methods
  private async storeOfflineProjects(projects: CompanyCamProject[]): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('projects', 'readwrite');
    for (const project of projects) {
      await tx.store.put(project);
    }
    await tx.done;
  }

  private async storeOfflineProject(project: CompanyCamProject): Promise<void> {
    if (!this.db) return;
    await this.db.put('projects', project);
  }

  private async getOfflineProjects(): Promise<CompanyCamProject[]> {
    if (!this.db) return [];
    return this.db.getAll('projects');
  }

  private async getOfflineProject(projectId: string): Promise<CompanyCamProject | null> {
    if (!this.db) return null;
    const project = await this.db.get('projects', projectId);
    return project || null;
  }

  private async storeOfflinePhoto(
    projectId: string,
    photo: CompanyCamPhoto,
    file?: File
  ): Promise<void> {
    if (!this.db) return;

    const photoWithProject = {
      ...photo,
      project_id: projectId
    };

    // Store photo metadata
    await this.db.put('photos', photoWithProject);

    // Store file data if provided
    if (file) {
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onload = async () => {
        if (reader.result && this.db) {
          photoWithProject.offline_path = reader.result as string;
          await this.db.put('photos', photoWithProject);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  private async getOfflinePhotos(projectId: string): Promise<CompanyCamPhoto[]> {
    if (!this.db) return [];
    const tx = this.db.transaction('photos', 'readonly');
    const index = tx.store.index('project_id');
    return index.getAll(projectId);
  }

  private async updateOfflinePhoto(photo: CompanyCamPhoto): Promise<void> {
    if (!this.db) return;

    // Get existing photo to preserve project_id
    const existing = await this.db.get('photos', photo.id);
    if (existing) {
      const updated = { ...existing, ...photo };
      await this.db.put('photos', updated);
    }
  }

  private async queuePhotoUpload(
    projectId: string,
    photo: CompanyCamPhoto,
    file: File
  ): Promise<void> {
    if (!this.db) return;

    const uploadRecord = {
      id: `upload_${photo.id}`,
      project_id: projectId,
      photo_id: photo.id,
      created_at: new Date().toISOString(),
      file_data: await this.fileToBase64(file),
      file_name: file.name,
      file_type: file.type,
      file_size: file.size
    };

    await this.db.put('pending_uploads', uploadRecord);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  private async storeOfflineAnnotation(
    photoId: string,
    annotation: PhotoAnnotation
  ): Promise<void> {
    if (!this.db) return;

    // Get photo and add annotation
    const photo = await this.db.get('photos', photoId);
    if (photo) {
      photo.annotations = photo.annotations || [];
      photo.annotations.push(annotation);
      await this.db.put('photos', photo);
    }
  }

  private async updateOfflinePhotoTags(photoId: string, newTags: string[]): Promise<void> {
    if (!this.db) return;

    const photo = await this.db.get('photos', photoId);
    if (photo) {
      photo.tags = [...new Set([...photo.tags, ...newTags])];
      await this.db.put('photos', photo);
    }
  }

  // Sync Methods
  async syncPendingUploads(): Promise<{ success: number; failed: number }> {
    if (!this.db || !this.isInitialized) {
      return { success: 0, failed: 0 };
    }

    const pendingUploads = await this.db.getAll('pending_uploads');
    let success = 0;
    let failed = 0;

    for (const upload of pendingUploads) {
      try {
        // Convert base64 back to file
        const response = await fetch(upload.file_data);
        const blob = await response.blob();
        const file = new File([blob], upload.file_name, { type: upload.file_type });

        // Upload the photo
        await this.uploadPhoto(upload.project_id, file, {
          tags: [], // Tags should already be stored with the photo
          autoTag: false
        });

        // Remove from pending uploads
        await this.db.delete('pending_uploads', upload.id);
        success++;
      } catch (error) {
        logger.error('Failed to sync photo upload', { error, upload });
        failed++;
      }
    }

    logger.info('Photo sync completed', { success, failed });
    return { success, failed };
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'online' | 'offline'; details: any }> {
    if (!this.isInitialized || !this.client) {
      return { status: 'offline', details: { reason: 'API not initialized' } };
    }

    try {
      await this.client.get('/health');
      return { status: 'online', details: { api: 'available' } };
    } catch (error) {
      return { status: 'offline', details: { error: (error as Error).message } };
    }
  }
}

export const companyCamApi = new CompanyCamApiService();

// Webhook event types for external integration
export const WEBHOOK_EVENTS = {
  PHOTO_UPLOADED: 'photo_uploaded',
  PROJECT_CREATED: 'project_created',
  ANNOTATION_ADDED: 'annotation_added',
  TAG_ADDED: 'tag_added'
} as const;

// Export woodwork tags for use in UI components
export { WOODWORK_TAGS };
