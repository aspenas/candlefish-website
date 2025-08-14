import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { GET_PROJECTS, GET_PROJECT } from '@/graphql/queries';
import { UPLOAD_PROJECT_PHOTO } from '@/graphql/mutations';
import { PROJECT_PHOTO_UPLOADED, PROJECT_TIMELINE_UPDATED } from '@/graphql/subscriptions';
import { ProjectStatus } from '@/types';
import { ProjectGallery } from '@/components/gallery/ProjectGallery';

const mockProjects = [
  {
    id: 'project-1',
    customerId: 'customer-1',
    name: 'Kitchen Remodel',
    description: 'Complete kitchen renovation with new cabinets',
    status: ProjectStatus.IN_PROGRESS,
    companyCamPhotos: [
      {
        id: 'photo-1',
        url: 'https://example.com/photo1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        caption: 'Before demo',
        uploadedAt: '2024-01-15T10:00:00Z',
        uploadedBy: 'user-123',
        metadata: { fileSize: 2048000 }
      }
    ],
    timeline: [
      {
        id: 'timeline-1',
        type: 'MILESTONE',
        title: 'Project Started',
        description: 'Demo phase completed',
        timestamp: '2024-01-15T08:00:00Z',
        userId: 'user-123',
        metadata: { phase: 'demolition' }
      }
    ],
    estimateId: 'estimate-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'project-2',
    customerId: 'customer-1',
    name: 'Bathroom Renovation',
    description: 'Master bathroom remodel',
    status: ProjectStatus.COMPLETED,
    companyCamPhotos: [],
    timeline: [],
    estimateId: 'estimate-2',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  }
];

const createProjectsMock = (variables = {}) => ({
  request: {
    query: GET_PROJECTS,
    variables: {
      filter: {},
      limit: 50,
      ...variables
    }
  },
  result: {
    data: {
      projects: {
        edges: mockProjects.map((project, index) => ({
          node: project,
          cursor: `project-cursor-${index + 1}`
        })),
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'project-cursor-1',
          endCursor: `project-cursor-${mockProjects.length}`
        },
        totalCount: mockProjects.length
      }
    }
  }
});

const createProjectMock = (projectId: string) => ({
  request: {
    query: GET_PROJECT,
    variables: { id: projectId }
  },
  result: {
    data: {
      project: mockProjects.find(p => p.id === projectId) || mockProjects[0]
    }
  }
});

const createUploadMock = () => ({
  request: {
    query: UPLOAD_PROJECT_PHOTO,
    variables: {
      projectId: 'project-1',
      file: expect.any(File),
      caption: expect.stringMatching(/Uploaded/)
    }
  },
  result: {
    data: {
      uploadProjectPhoto: {
        id: 'photo-new',
        url: 'https://example.com/new-photo.jpg',
        thumbnailUrl: 'https://example.com/new-thumb.jpg',
        caption: 'Uploaded photo',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'user-123',
        metadata: { fileSize: 1024000 }
      }
    }
  }
});

const createSubscriptionMock = (subscription: any, projectId: string, data: any) => ({
  request: {
    query: subscription,
    variables: { projectId }
  },
  result: {
    data
  }
});

describe('ProjectGallery', () => {
  it('renders the gallery header correctly', async () => {
    const mocks = [createProjectsMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    expect(screen.getByText('Project Gallery')).toBeInTheDocument();
    expect(screen.getByText('View Company Cam photos and project timelines')).toBeInTheDocument();
  });

  it('displays project list with correct information', async () => {
    const mocks = [createProjectsMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
      expect(screen.getByText('Bathroom Renovation')).toBeInTheDocument();
      expect(screen.getByText('2 projects')).toBeInTheDocument();
    });

    // Check project details
    const kitchenProject = screen.getByText('Kitchen Remodel').closest('button');
    expect(kitchenProject).toBeInTheDocument();

    if (kitchenProject) {
      expect(within(kitchenProject).getByText('Complete kitchen renovation with new cabinets')).toBeInTheDocument();
      expect(within(kitchenProject).getByText('IN PROGRESS')).toBeInTheDocument();
      expect(within(kitchenProject).getByText('1 photos')).toBeInTheDocument();
    }
  });

  it('handles project selection and displays project details', async () => {
    const user = userEvent.setup();
    const mocks = [
      createProjectsMock(),
      createProjectMock('project-1')
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
    });

    const projectButton = screen.getByText('Kitchen Remodel').closest('button');
    expect(projectButton).toBeInTheDocument();

    if (projectButton) {
      await user.click(projectButton);

      await waitFor(() => {
        // Should show project details in main content area
        const mainArea = screen.getByText('Kitchen Remodel').closest('.lg\\:col-span-2');
        expect(mainArea).toBeInTheDocument();
      });
    }
  });

  it('switches between grid and timeline views', async () => {
    const user = userEvent.setup();
    const mocks = [
      createProjectsMock(),
      createProjectMock('project-1')
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
    });

    // Select a project first
    const projectButton = screen.getByText('Kitchen Remodel').closest('button');
    if (projectButton) {
      await user.click(projectButton);
    }

    await waitFor(() => {
      // Grid view should be active by default
      const gridButton = screen.getByRole('button', { name: /grid view/i });
      expect(gridButton).toHaveClass('bg-blue-100');
    });

    // Switch to timeline view
    const timelineButton = screen.getByRole('button', { name: /timeline view/i });
    await user.click(timelineButton);

    expect(timelineButton).toHaveClass('bg-blue-100');
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    const searchMock = createProjectsMock({
      variables: {
        filter: { search: 'kitchen' },
        limit: 50
      }
    });
    // Override the mock to return only kitchen project
    searchMock.result.data.projects.edges = [searchMock.result.data.projects.edges[0]];
    searchMock.result.data.projects.totalCount = 1;

    const mocks = [createProjectsMock(), searchMock];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('2 projects')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search projects by name or description...');
    await user.type(searchInput, 'kitchen');

    await waitFor(() => {
      expect(screen.getByText('1 projects')).toBeInTheDocument();
    });
  });

  it('handles status filter', async () => {
    const user = userEvent.setup();
    const filterMock = createProjectsMock({
      variables: {
        filter: { status: ProjectStatus.COMPLETED },
        limit: 50
      }
    });
    // Override to return only completed project
    filterMock.result.data.projects.edges = [filterMock.result.data.projects.edges[1]];
    filterMock.result.data.projects.totalCount = 1;

    const mocks = [createProjectsMock(), filterMock];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('2 projects')).toBeInTheDocument();
    });

    // Open status filter
    const statusFilter = screen.getByDisplayValue('Filter by status');
    await user.click(statusFilter);
    await user.selectOptions(statusFilter, ProjectStatus.COMPLETED);

    await waitFor(() => {
      expect(screen.getByText('1 projects')).toBeInTheDocument();
    });
  });

  it('handles photo upload', async () => {
    const user = userEvent.setup();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const mocks = [
      createProjectsMock(),
      createProjectMock('project-1'),
      createUploadMock()
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    // Select project first
    await waitFor(() => {
      expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
    });

    const projectButton = screen.getByText('Kitchen Remodel').closest('button');
    if (projectButton) {
      await user.click(projectButton);
    }

    await waitFor(() => {
      // Look for upload functionality in PhotoGrid component
      const uploadArea = screen.getByTestId('photo-upload-area');
      expect(uploadArea).toBeInTheDocument();
    });

    // Simulate file upload
    const fileInput = screen.getByTestId('file-input');
    await user.upload(fileInput, file);

    // Should show uploading state
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('displays empty state when no projects exist', async () => {
    const emptyMock = createProjectsMock();
    emptyMock.result.data.projects.edges = [];
    emptyMock.result.data.projects.totalCount = 0;

    const mocks = [emptyMock];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(screen.getByText('Create your first project to get started.')).toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    const loadingMock = {
      request: {
        query: GET_PROJECTS,
        variables: { filter: {}, limit: 50 }
      },
      result: {
        loading: true
      }
    };

    render(
      <MockedProvider mocks={[loadingMock]} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('handles GraphQL errors gracefully', async () => {
    const errorMock = {
      request: {
        query: GET_PROJECTS,
        variables: { filter: {}, limit: 50 }
      },
      error: new Error('Failed to load projects')
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      expect(screen.getByText('Unable to fetch project data')).toBeInTheDocument();
    });
  });

  it('handles photo upload subscription updates', async () => {
    const user = userEvent.setup();
    const subscriptionData = {
      projectPhotoUploaded: {
        id: 'photo-new',
        url: 'https://example.com/new-photo.jpg',
        thumbnailUrl: 'https://example.com/new-thumb.jpg',
        caption: 'New photo',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'user-123',
        metadata: { fileSize: 1024000 }
      }
    };

    const mocks = [
      createProjectsMock(),
      createProjectMock('project-1'),
      createSubscriptionMock(PROJECT_PHOTO_UPLOADED, 'project-1', subscriptionData)
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    // Select project to trigger subscription
    await waitFor(() => {
      expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
    });

    const projectButton = screen.getByText('Kitchen Remodel').closest('button');
    if (projectButton) {
      await user.click(projectButton);
    }

    // Wait for project details to load and subscription to be active
    await waitFor(() => {
      expect(screen.getByText('Complete kitchen renovation with new cabinets')).toBeInTheDocument();
    });
  });

  it('handles timeline update subscription', async () => {
    const user = userEvent.setup();
    const subscriptionData = {
      projectTimelineUpdated: {
        id: 'timeline-new',
        type: 'UPDATE',
        title: 'Progress Update',
        description: 'Cabinets installed',
        timestamp: new Date().toISOString(),
        userId: 'user-123',
        metadata: { phase: 'installation' }
      }
    };

    const mocks = [
      createProjectsMock(),
      createProjectMock('project-1'),
      createSubscriptionMock(PROJECT_TIMELINE_UPDATED, 'project-1', subscriptionData)
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    // Select project to trigger subscription
    await waitFor(() => {
      expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
    });

    const projectButton = screen.getByText('Kitchen Remodel').closest('button');
    if (projectButton) {
      await user.click(projectButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Complete kitchen renovation with new cabinets')).toBeInTheDocument();
    });
  });

  it('filters projects by customerId when provided', async () => {
    const customerFilterMock = createProjectsMock({
      variables: {
        filter: { customerId: 'customer-1' },
        limit: 50
      }
    });

    render(
      <MockedProvider mocks={[customerFilterMock]} addTypename={false}>
        <ProjectGallery customerId="customer-1" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
    });
  });

  it('displays project status badges correctly', async () => {
    const mocks = [createProjectsMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    // Check badge colors
    const inProgressBadge = screen.getByText('IN PROGRESS');
    expect(inProgressBadge).toHaveClass('bg-blue-100', 'text-blue-800');

    const completedBadge = screen.getByText('COMPLETED');
    expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('shows select project message when no project is selected', async () => {
    const mocks = [createProjectsMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProjectGallery />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Select a project')).toBeInTheDocument();
      expect(screen.getByText('Choose a project from the list to view photos and timeline')).toBeInTheDocument();
    });
  });
});
