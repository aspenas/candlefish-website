import { CompanyCamAPI } from '@/lib/services/companycam-api';
import { companyCamConfig } from '@/lib/config/integrations';

// Mock HTTP client
const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock('axios', () => ({
  create: () => mockHttpClient,
}));

describe('Company Cam Integration', () => {
  let companyCamAPI: CompanyCamAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    companyCamAPI = new CompanyCamAPI({
      apiKey: 'test-api-key',
      baseURL: 'https://api.companycam.com/v2',
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid API key', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: {
          user: {
            id: 'user123',
            email: 'test@paintbox.com',
            company: { name: 'Paintbox Inc' },
          },
        },
      });

      const result = await companyCamAPI.authenticate();

      expect(result.authenticated).toBe(true);
      expect(result.user.id).toBe('user123');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/me');
    });

    it('should handle invalid API key', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(companyCamAPI.authenticate()).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors during authentication', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network timeout'));

      await expect(companyCamAPI.authenticate()).rejects.toThrow('Network timeout');
    });
  });

  describe('Project Management', () => {
    const mockProject = {
      id: 'cc-project-123',
      name: 'Kitchen Renovation - 123 Main St',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
      },
      status: 'active',
      createdAt: '2025-01-15T10:00:00Z',
    };

    it('should create new project in Company Cam', async () => {
      mockHttpClient.post.mockResolvedValue({
        status: 201,
        data: { project: mockProject },
      });

      const projectData = {
        name: 'Kitchen Renovation - 123 Main St',
        address: '123 Main St, Anytown, CA 12345',
        description: 'Interior and exterior painting project',
        estimateId: 'estimate123',
      };

      const result = await companyCamAPI.createProject(projectData);

      expect(result.project.id).toBe('cc-project-123');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/projects', {
        name: projectData.name,
        address: projectData.address,
        description: projectData.description,
        tags: ['paintbox', `estimate:${projectData.estimateId}`],
      });
    });

    it('should retrieve existing project by estimate ID', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: {
          projects: [mockProject],
          pagination: { total: 1, page: 1, perPage: 10 },
        },
      });

      const result = await companyCamAPI.findProjectByEstimate('estimate123');

      expect(result.project.id).toBe('cc-project-123');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/projects', {
        params: {
          tags: 'estimate:estimate123',
          limit: 1,
        },
      });
    });

    it('should update project status based on estimate workflow', async () => {
      mockHttpClient.put.mockResolvedValue({
        status: 200,
        data: { project: { ...mockProject, status: 'completed' } },
      });

      await companyCamAPI.updateProjectStatus('cc-project-123', 'ACCEPTED');

      expect(mockHttpClient.put).toHaveBeenCalledWith('/projects/cc-project-123', {
        status: 'completed',
        tags: expect.arrayContaining(['estimate:accepted']),
      });
    });
  });

  describe('Photo Upload with WW Tagging', () => {
    const mockPhoto = {
      uri: 'file:///path/to/photo.jpg',
      estimateId: 'estimate123',
      roomId: 'kitchen',
      wwTag: 'WW15-001',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
      },
      timestamp: '2025-01-15T12:00:00Z',
    };

    it('should upload photo with WW tag to Company Cam', async () => {
      mockHttpClient.post.mockResolvedValue({
        status: 201,
        data: {
          photo: {
            id: 'photo123',
            url: 'https://api.companycam.com/photos/photo123.jpg',
            tags: ['WW15-001', 'kitchen', 'estimate123'],
            gps: { lat: 40.7128, lng: -74.0060 },
          },
        },
      });

      const result = await companyCamAPI.uploadPhoto(mockPhoto);

      expect(result.photo.id).toBe('photo123');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/photos',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
          }),
        })
      );

      // Verify FormData contains correct tags
      const formData = mockHttpClient.post.mock.calls[0][1];
      expect(formData.get('tags')).toBe('WW15-001,kitchen,estimate123');
      expect(formData.get('latitude')).toBe('40.7128');
      expect(formData.get('longitude')).toBe('-74.0060');
    });

    it('should handle WW1-WW30 tag range validation', async () => {
      const testCases = [
        { wwTag: 'WW1-001', valid: true },
        { wwTag: 'WW15-001', valid: true },
        { wwTag: 'WW30-001', valid: true },
        { wwTag: 'WW31-001', valid: false },
        { wwTag: 'WW0-001', valid: false },
        { wwTag: 'XX15-001', valid: false },
      ];

      for (const testCase of testCases) {
        const photo = { ...mockPhoto, wwTag: testCase.wwTag };

        if (testCase.valid) {
          mockHttpClient.post.mockResolvedValue({
            status: 201,
            data: { photo: { id: 'photo123', tags: [testCase.wwTag] } },
          });

          await expect(companyCamAPI.uploadPhoto(photo)).resolves.toBeDefined();
        } else {
          await expect(companyCamAPI.uploadPhoto(photo)).rejects.toThrow(
            'Invalid WW tag format'
          );
        }
      }
    });

    it('should organize photos by WW tag ranges', async () => {
      const photos = [
        { ...mockPhoto, wwTag: 'WW1-001' },
        { ...mockPhoto, wwTag: 'WW1-002' },
        { ...mockPhoto, wwTag: 'WW15-001' },
        { ...mockPhoto, wwTag: 'WW30-001' },
      ];

      mockHttpClient.post.mockResolvedValue({
        status: 201,
        data: { photos: photos.map((p, i) => ({ id: `photo${i}`, tags: [p.wwTag] })) },
      });

      const result = await companyCamAPI.batchUploadPhotos('cc-project-123', photos);

      expect(result.organized.WW1).toHaveLength(2);
      expect(result.organized.WW15).toHaveLength(1);
      expect(result.organized.WW30).toHaveLength(1);
    });

    it('should handle photo upload failures gracefully', async () => {
      mockHttpClient.post.mockRejectedValue({
        response: {
          status: 413,
          data: { error: 'File too large' },
        },
      });

      await expect(companyCamAPI.uploadPhoto(mockPhoto)).rejects.toThrow('File too large');
    });

    it('should compress large photos before upload', async () => {
      const largePhoto = {
        ...mockPhoto,
        metadata: {
          fileSize: 15 * 1024 * 1024, // 15MB
          dimensions: { width: 4000, height: 3000 },
        },
      };

      mockHttpClient.post.mockResolvedValue({
        status: 201,
        data: { photo: { id: 'photo123' } },
      });

      await companyCamAPI.uploadPhoto(largePhoto);

      // Should compress the photo before upload
      const formData = mockHttpClient.post.mock.calls[0][1];
      expect(formData.get('quality')).toBe('0.8');
      expect(formData.get('maxWidth')).toBe('2048');
      expect(formData.get('maxHeight')).toBe('1536');
    });
  });

  describe('Real-time Collaboration', () => {
    it('should subscribe to project updates', async () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      };

      global.EventSource = jest.fn().mockImplementation(() => mockEventSource);

      const onUpdate = jest.fn();
      await companyCamAPI.subscribeToProject('cc-project-123', onUpdate);

      expect(global.EventSource).toHaveBeenCalledWith(
        'https://api.companycam.com/v2/projects/cc-project-123/events',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-api-key' },
        })
      );

      // Simulate receiving an update
      const eventCallback = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1];

      eventCallback({
        data: JSON.stringify({
          type: 'photo_added',
          data: {
            photo: { id: 'photo123', tags: ['WW15-001'] },
            user: { name: 'John Doe' },
          },
        }),
      });

      expect(onUpdate).toHaveBeenCalledWith({
        type: 'photo_added',
        data: expect.objectContaining({
          photo: { id: 'photo123', tags: ['WW15-001'] },
        }),
      });
    });

    it('should notify team members of new photos', async () => {
      mockHttpClient.post.mockResolvedValue({
        status: 200,
        data: { notification: { sent: true, recipients: 3 } },
      });

      const result = await companyCamAPI.notifyTeam('cc-project-123', {
        type: 'new_photos',
        message: 'New photos uploaded with WW15 tags',
        data: {
          photoCount: 5,
          wwTags: ['WW15-001', 'WW15-002', 'WW15-003', 'WW15-004', 'WW15-005'],
        },
      });

      expect(result.notification.sent).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/projects/cc-project-123/notifications',
        {
          type: 'new_photos',
          message: 'New photos uploaded with WW15 tags',
          data: expect.objectContaining({
            photoCount: 5,
            wwTags: expect.arrayContaining(['WW15-001']),
          }),
        }
      );
    });

    it('should sync estimate status changes to Company Cam', async () => {
      mockHttpClient.put.mockResolvedValue({
        status: 200,
        data: { project: { status: 'sent_to_customer' } },
      });

      await companyCamAPI.syncEstimateStatus('cc-project-123', {
        from: 'DRAFT',
        to: 'SENT',
        estimateId: 'estimate123',
        timestamp: '2025-01-15T14:00:00Z',
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith('/projects/cc-project-123', {
        status: 'sent_to_customer',
        tags: expect.arrayContaining(['estimate:sent']),
        notes: 'Estimate estimate123 changed from DRAFT to SENT',
      });
    });
  });

  describe('Photo Organization and Search', () => {
    it('should retrieve photos by WW tag range', async () => {
      const mockPhotos = [
        { id: 'photo1', tags: ['WW15-001', 'kitchen'], url: 'photo1.jpg' },
        { id: 'photo2', tags: ['WW15-002', 'kitchen'], url: 'photo2.jpg' },
        { id: 'photo3', tags: ['WW15-003', 'bathroom'], url: 'photo3.jpg' },
      ];

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { photos: mockPhotos },
      });

      const result = await companyCamAPI.getPhotosByWWRange('cc-project-123', 'WW15');

      expect(result.photos).toHaveLength(3);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/projects/cc-project-123/photos', {
        params: {
          tags: 'WW15',
          limit: 100,
        },
      });
    });

    it('should generate photo gallery for estimate PDF', async () => {
      const mockPhotos = [
        { id: 'photo1', tags: ['WW15-001'], url: 'photo1.jpg', thumbnail: 'thumb1.jpg' },
        { id: 'photo2', tags: ['WW15-002'], url: 'photo2.jpg', thumbnail: 'thumb2.jpg' },
      ];

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { photos: mockPhotos },
      });

      const gallery = await companyCamAPI.generatePhotoGallery('cc-project-123', {
        wwTags: ['WW15-001', 'WW15-002'],
        thumbnailSize: 'medium',
        includeMetadata: true,
      });

      expect(gallery.photos).toHaveLength(2);
      expect(gallery.photos[0]).toEqual(
        expect.objectContaining({
          id: 'photo1',
          thumbnail: 'thumb1.jpg',
          wwTag: 'WW15-001',
        })
      );
    });

    it('should export photo manifest for estimate', async () => {
      const mockManifest = {
        estimateId: 'estimate123',
        projectId: 'cc-project-123',
        photos: [
          {
            wwTag: 'WW15-001',
            filename: 'WW15-001_kitchen_north_wall.jpg',
            room: 'kitchen',
            description: 'North wall showing prep work needed',
            gps: { lat: 40.7128, lng: -74.0060 },
            timestamp: '2025-01-15T12:00:00Z',
          },
        ],
        totalPhotos: 1,
        coverageMap: {
          WW15: 1,
        },
      };

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockManifest,
      });

      const manifest = await companyCamAPI.exportPhotoManifest('estimate123');

      expect(manifest.totalPhotos).toBe(1);
      expect(manifest.coverageMap.WW15).toBe(1);
      expect(manifest.photos[0].wwTag).toBe('WW15-001');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should retry failed requests with exponential backoff', async () => {
      mockHttpClient.post
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          status: 201,
          data: { photo: { id: 'photo123' } },
        });

      const result = await companyCamAPI.uploadPhoto(mockPhoto, { 
        retryCount: 3,
        exponentialBackoff: true,
      });

      expect(result.photo.id).toBe('photo123');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });

    it('should handle rate limiting', async () => {
      mockHttpClient.post.mockRejectedValue({
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { error: 'Rate limit exceeded' },
        },
      });

      const startTime = Date.now();
      
      await expect(companyCamAPI.uploadPhoto(mockPhoto)).rejects.toThrow(
        'Rate limit exceeded'
      );

      // Should have attempted to wait for retry-after period
      expect(Date.now() - startTime).toBeGreaterThan(1000); // At least 1 second delay
    });

    it('should queue uploads when offline', async () => {
      const mockQueue = [];
      companyCamAPI.uploadQueue = mockQueue;

      // Simulate offline
      mockHttpClient.post.mockRejectedValue(new Error('Network unreachable'));

      await companyCamAPI.uploadPhoto(mockPhoto);

      expect(mockQueue).toContainEqual(
        expect.objectContaining({
          photo: mockPhoto,
          retryCount: 0,
        })
      );
    });

    it('should process queued uploads when back online', async () => {
      const queuedPhotos = [
        { photo: { ...mockPhoto, wwTag: 'WW15-001' }, retryCount: 0 },
        { photo: { ...mockPhoto, wwTag: 'WW15-002' }, retryCount: 1 },
      ];

      companyCamAPI.uploadQueue = queuedPhotos;

      mockHttpClient.post.mockResolvedValue({
        status: 201,
        data: { photo: { id: 'photo123' } },
      });

      const result = await companyCamAPI.processUploadQueue();

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(companyCamAPI.uploadQueue).toHaveLength(0);
    });

    it('should validate Company Cam API responses', async () => {
      // Mock malformed response
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { invalid: 'response' },
      });

      await expect(companyCamAPI.authenticate()).rejects.toThrow(
        'Invalid response format from Company Cam API'
      );
    });
  });

  describe('Performance and Optimization', () => {
    it('should batch multiple photo uploads', async () => {
      const photos = Array.from({ length: 10 }, (_, i) => ({
        ...mockPhoto,
        wwTag: `WW15-${String(i + 1).padStart(3, '0')}`,
      }));

      mockHttpClient.post.mockResolvedValue({
        status: 201,
        data: {
          batch: {
            successful: 10,
            failed: 0,
            photos: photos.map((p, i) => ({ id: `photo${i}`, tags: [p.wwTag] })),
          },
        },
      });

      const result = await companyCamAPI.batchUploadPhotos('cc-project-123', photos);

      expect(result.batch.successful).toBe(10);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/projects/cc-project-123/photos/batch',
        expect.any(FormData)
      );
    });

    it('should cache frequently accessed data', async () => {
      const mockProject = { id: 'cc-project-123', name: 'Test Project' };

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { project: mockProject },
      });

      // First call
      await companyCamAPI.getProject('cc-project-123');
      
      // Second call should use cache
      await companyCamAPI.getProject('cc-project-123');

      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should paginate large photo collections', async () => {
      const totalPhotos = 250;
      const pageSize = 100;

      mockHttpClient.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            photos: Array(pageSize).fill().map((_, i) => ({ id: `photo${i}` })),
            pagination: { total: totalPhotos, page: 1, hasMore: true },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            photos: Array(pageSize).fill().map((_, i) => ({ id: `photo${i + 100}` })),
            pagination: { total: totalPhotos, page: 2, hasMore: true },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            photos: Array(50).fill().map((_, i) => ({ id: `photo${i + 200}` })),
            pagination: { total: totalPhotos, page: 3, hasMore: false },
          },
        });

      const allPhotos = await companyCamAPI.getAllPhotos('cc-project-123');

      expect(allPhotos.photos).toHaveLength(250);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    });
  });
});