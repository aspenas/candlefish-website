// Mock Project resolver for testing federation architecture
import { ProjectStatus } from '@/types/graphql';

// Mock resolver implementation for testing purposes
const mockProjectResolver = {
  projects: (parent: any, args: any, context: any) => {
    const { filter, limit = 10, offset = 0 } = args;

    const mockProjects = [
      {
        id: 'project-1',
        customerId: 'customer-1',
        name: 'Kitchen Remodel',
        description: 'Complete kitchen renovation with new cabinets and countertops',
        status: ProjectStatus.InProgress,
        companyCamPhotos: [
          {
            id: 'photo-1',
            url: 'https://example.com/photos/photo1.jpg',
            thumbnailUrl: 'https://example.com/photos/thumb1.jpg',
            caption: 'Before kitchen demo',
            uploadedAt: '2024-01-15T10:00:00Z',
            uploadedBy: 'user-123',
            metadata: { fileSize: 2048000, dimensions: '1920x1080' }
          }
        ],
        timeline: [
          {
            id: 'timeline-1',
            type: 'MILESTONE',
            title: 'Project Started',
            description: 'Demolition phase completed',
            timestamp: '2024-01-15T08:00:00Z',
            userId: 'user-123',
            metadata: { phase: 'demolition' }
          }
        ],
        estimateId: 'estimate-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'project-2',
        customerId: 'customer-2',
        name: 'Bathroom Renovation',
        description: 'Master bathroom remodel',
        status: ProjectStatus.Completed,
        companyCamPhotos: [],
        timeline: [
          {
            id: 'timeline-2',
            type: 'UPDATE',
            title: 'Project Completed',
            description: 'Final inspection passed',
            timestamp: '2024-02-01T16:00:00Z',
            userId: 'user-123',
            metadata: { inspectionScore: 'A+' }
          }
        ],
        estimateId: 'estimate-2',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-02-01T16:00:00Z'
      }
    ];

    let filteredProjects = mockProjects;

    // Apply filters
    if (filter) {
      if (filter.customerId) {
        filteredProjects = filteredProjects.filter(project =>
          project.customerId === filter.customerId
        );
      }

      if (filter.status) {
        filteredProjects = filteredProjects.filter(project =>
          project.status === filter.status
        );
      }

      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        filteredProjects = filteredProjects.filter(project =>
          project.name.toLowerCase().includes(searchTerm) ||
          project.description.toLowerCase().includes(searchTerm)
        );
      }
    }

    // Apply pagination
    const totalCount = filteredProjects.length;
    const paginatedProjects = filteredProjects.slice(offset, offset + limit);

    return {
      edges: paginatedProjects.map((project, index) => ({
        node: project,
        cursor: `project-cursor-${offset + index + 1}`
      })),
      pageInfo: {
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
        startCursor: paginatedProjects.length > 0 ? `project-cursor-${offset + 1}` : null,
        endCursor: paginatedProjects.length > 0 ? `project-cursor-${offset + paginatedProjects.length}` : null
      },
      totalCount
    };
  },

  project: (parent: any, args: any, context: any) => {
    const { id } = args;

    return {
      id,
      customerId: 'customer-1',
      name: 'Kitchen Remodel',
      description: 'Complete kitchen renovation with new cabinets and countertops',
      status: ProjectStatus.InProgress,
      companyCamPhotos: [
        {
          id: 'photo-1',
          url: 'https://example.com/photos/photo1.jpg',
          thumbnailUrl: 'https://example.com/photos/thumb1.jpg',
          caption: 'Before kitchen demo',
          uploadedAt: '2024-01-15T10:00:00Z',
          uploadedBy: 'user-123',
          metadata: { fileSize: 2048000, dimensions: '1920x1080' }
        },
        {
          id: 'photo-2',
          url: 'https://example.com/photos/photo2.jpg',
          thumbnailUrl: 'https://example.com/photos/thumb2.jpg',
          caption: 'After cabinet installation',
          uploadedAt: '2024-01-20T14:00:00Z',
          uploadedBy: 'user-456',
          metadata: { fileSize: 1920000, dimensions: '1920x1080' }
        }
      ],
      timeline: [
        {
          id: 'timeline-1',
          type: 'MILESTONE',
          title: 'Project Started',
          description: 'Demolition phase completed',
          timestamp: '2024-01-15T08:00:00Z',
          userId: 'user-123',
          metadata: { phase: 'demolition' }
        },
        {
          id: 'timeline-2',
          type: 'UPDATE',
          title: 'Cabinets Installed',
          description: 'New cabinets have been installed',
          timestamp: '2024-01-20T12:00:00Z',
          userId: 'user-456',
          metadata: { phase: 'installation' }
        }
      ],
      estimateId: 'estimate-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    };
  },

  syncProjectFromCompanyCam: (parent: any, args: any, context: any) => {
    const { companyCamProjectId } = args;

    return {
      success: true,
      project: {
        id: 'project-synced',
        customerId: 'customer-1',
        name: 'Synced Project from CompanyCam',
        description: 'Project synced from CompanyCam integration',
        status: ProjectStatus.InProgress,
        companyCamPhotos: [
          {
            id: 'photo-synced',
            url: 'https://companycam.com/photos/synced.jpg',
            thumbnailUrl: 'https://companycam.com/photos/synced-thumb.jpg',
            caption: 'Synced photo from CompanyCam',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'system',
            metadata: { source: 'companycam', companyCamId: companyCamProjectId }
          }
        ],
        timeline: [],
        estimateId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      errors: []
    };
  }
};

describe('Project Resolver', () => {
  describe('projects query', () => {
    it('should return paginated projects list', () => {
      const result = mockProjectResolver.projects(
        null,
        { filter: {}, limit: 10, offset: 0 },
        {}
      );

      expect(result).toBeDefined();
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]).toHaveProperty('node');
      expect(result.edges[0]).toHaveProperty('cursor');
      expect(result.totalCount).toBe(2);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should handle pagination correctly', () => {
      const result = mockProjectResolver.projects(
        null,
        { filter: {}, limit: 1, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBe('project-cursor-1');
      expect(result.pageInfo.endCursor).toBe('project-cursor-1');
    });

    it('should filter by customerId', () => {
      const result = mockProjectResolver.projects(
        null,
        { filter: { customerId: 'customer-1' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.customerId).toBe('customer-1');
      expect(result.edges[0].node.name).toBe('Kitchen Remodel');
    });

    it('should filter by status', () => {
      const result = mockProjectResolver.projects(
        null,
        { filter: { status: ProjectStatus.Completed }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.status).toBe(ProjectStatus.Completed);
      expect(result.edges[0].node.name).toBe('Bathroom Renovation');
    });

    it('should filter by search term', () => {
      const result = mockProjectResolver.projects(
        null,
        { filter: { search: 'kitchen' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.name).toBe('Kitchen Remodel');
    });

    it('should return empty results for non-matching filters', () => {
      const result = mockProjectResolver.projects(
        null,
        { filter: { search: 'nonexistent project' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('project query', () => {
    it('should return a single project by id', () => {
      const projectId = 'project-123';
      const result = mockProjectResolver.project(
        null,
        { id: projectId },
        {}
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(projectId);
      expect(result.name).toBe('Kitchen Remodel');
      expect(result.description).toBe('Complete kitchen renovation with new cabinets and countertops');
      expect(result.status).toBe(ProjectStatus.InProgress);
      expect(result.customerId).toBe('customer-1');
    });

    it('should include CompanyCam photos', () => {
      const result = mockProjectResolver.project(null, { id: 'test' }, {});

      expect(result.companyCamPhotos).toBeDefined();
      expect(result.companyCamPhotos).toHaveLength(2);

      const photo1 = result.companyCamPhotos[0];
      expect(photo1.id).toBe('photo-1');
      expect(photo1.url).toBe('https://example.com/photos/photo1.jpg');
      expect(photo1.thumbnailUrl).toBe('https://example.com/photos/thumb1.jpg');
      expect(photo1.caption).toBe('Before kitchen demo');
      expect(photo1.uploadedBy).toBe('user-123');
      expect(photo1.metadata).toEqual({ fileSize: 2048000, dimensions: '1920x1080' });
    });

    it('should include project timeline', () => {
      const result = mockProjectResolver.project(null, { id: 'test' }, {});

      expect(result.timeline).toBeDefined();
      expect(result.timeline).toHaveLength(2);

      const milestone = result.timeline[0];
      expect(milestone.id).toBe('timeline-1');
      expect(milestone.type).toBe('MILESTONE');
      expect(milestone.title).toBe('Project Started');
      expect(milestone.description).toBe('Demolition phase completed');
      expect(milestone.userId).toBe('user-123');
      expect(milestone.metadata).toEqual({ phase: 'demolition' });
    });

    it('should have valid timestamp formats', () => {
      const result = mockProjectResolver.project(null, { id: 'test' }, {});

      expect(new Date(result.createdAt)).toBeInstanceOf(Date);
      expect(new Date(result.updatedAt)).toBeInstanceOf(Date);

      result.companyCamPhotos.forEach(photo => {
        expect(new Date(photo.uploadedAt)).toBeInstanceOf(Date);
      });

      result.timeline.forEach(event => {
        expect(new Date(event.timestamp)).toBeInstanceOf(Date);
      });
    });

    it('should include estimate reference', () => {
      const result = mockProjectResolver.project(null, { id: 'test' }, {});
      expect(result.estimateId).toBe('estimate-1');
    });
  });

  describe('syncProjectFromCompanyCam mutation', () => {
    it('should successfully sync project from CompanyCam', () => {
      const companyCamProjectId = 'cc-project-123';
      const result = mockProjectResolver.syncProjectFromCompanyCam(
        null,
        { companyCamProjectId },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should return synced project with CompanyCam data', () => {
      const companyCamProjectId = 'cc-project-456';
      const result = mockProjectResolver.syncProjectFromCompanyCam(
        null,
        { companyCamProjectId },
        {}
      );

      const project = result.project;
      expect(project.name).toBe('Synced Project from CompanyCam');
      expect(project.description).toBe('Project synced from CompanyCam integration');
      expect(project.status).toBe(ProjectStatus.InProgress);

      expect(project.companyCamPhotos).toHaveLength(1);
      const syncedPhoto = project.companyCamPhotos[0];
      expect(syncedPhoto.caption).toBe('Synced photo from CompanyCam');
      expect(syncedPhoto.uploadedBy).toBe('system');
      expect(syncedPhoto.metadata.source).toBe('companycam');
      expect(syncedPhoto.metadata.companyCamId).toBe(companyCamProjectId);
    });

    it('should have valid timestamp formats for synced data', () => {
      const result = mockProjectResolver.syncProjectFromCompanyCam(
        null,
        { companyCamProjectId: 'test' },
        {}
      );

      const project = result.project;
      expect(new Date(project.createdAt)).toBeInstanceOf(Date);
      expect(new Date(project.updatedAt)).toBeInstanceOf(Date);
      expect(new Date(project.companyCamPhotos[0].uploadedAt)).toBeInstanceOf(Date);
    });
  });
});
