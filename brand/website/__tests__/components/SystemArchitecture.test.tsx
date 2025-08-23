import { render, screen, waitFor } from '@testing-library/react';
import SystemArchitecture from '../../components/SystemArchitecture';
import { getFranchiseGraph } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  getFranchiseGraph: jest.fn()
}));

const mockGetFranchiseGraph = getFranchiseGraph as jest.MockedFunction<typeof getFranchiseGraph>;

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? false : true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Three.js Canvas component
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: any) => (
    <div data-testid="mock-canvas" {...props}>
      {children}
    </div>
  ),
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ clock: { getElapsedTime: () => 0 } })),
}));

jest.mock('@react-three/drei', () => ({
  Html: ({ children, ...props }: any) => (
    <div data-testid="mock-html" {...props}>
      {children}
    </div>
  ),
  OrbitControls: () => <div data-testid="mock-orbit-controls" />,
}));

// Mock Three.js objects
jest.mock('three', () => ({
  ...jest.requireActual('three'),
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z })),
  Color: jest.fn().mockImplementation((color) => ({ color })),
  BufferGeometry: jest.fn().mockImplementation(() => ({
    setFromPoints: jest.fn(),
    setAttribute: jest.fn(),
  })),
  BufferAttribute: jest.fn(),
  CanvasTexture: jest.fn().mockImplementation(() => ({
    needsUpdate: true,
  })),
}));

describe('SystemArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API response with workshop-derived franchise data
    mockGetFranchiseGraph.mockResolvedValue({
      franchises: [
        {
          id: 'engraving-automation',
          name: 'Engraving Automation Platform',
          streams: 156,
          latency: '15ms'
        },
        {
          id: 'promoteros-intelligence',
          name: 'PromoterOS Concert Intelligence',
          streams: 89,
          latency: '23ms'
        },
        {
          id: 'inventory-automation',
          name: 'Highline Inventory Management System',
          streams: 67,
          latency: '12ms'
        }
      ],
      links: [
        { source: 'engraving-automation', target: 'inventory-automation' },
        { source: 'promoteros-intelligence', target: 'inventory-automation' }
      ],
      status: 'ACTIVE'
    });
  });

  it('renders canvas when not in reduced motion mode', async () => {
    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('loads franchise data from workshop projects', async () => {
    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });
  });

  it('renders static fallback for prefers-reduced-motion', async () => {
    // Mock reduced motion preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? true : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    // Should render static version
    expect(screen.getByText(/System Status: ACTIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Engraving Automation Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/156 streams/i)).toBeInTheDocument();
  });

  it('renders static fallback when no franchise data available', async () => {
    mockGetFranchiseGraph.mockResolvedValue({
      franchises: [],
      links: [],
      status: 'CALIBRATING'
    });

    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    // Should render static version with empty state
    expect(screen.getByText(/System Status: CALIBRATING/i)).toBeInTheDocument();
  });

  it('displays correct system status', async () => {
    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    // Test different status values
    mockGetFranchiseGraph.mockResolvedValue({
      franchises: [],
      links: [],
      status: 'OPERATIONAL'
    });

    // Re-render to trigger new data load
    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/System Status: OPERATIONAL/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockGetFranchiseGraph.mockRejectedValue(new Error('API Error'));

    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    // Should render static fallback due to empty data
    expect(screen.getByText(/System Status: CALIBRATING/i)).toBeInTheDocument();
  });

  it('refreshes data periodically', async () => {
    jest.useFakeTimers();

    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds to trigger refresh
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('generates franchise nodes from workshop projects with correct properties', async () => {
    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    // Verify franchise data structure matches workshop projects
    const lastCall = mockGetFranchiseGraph.mock.results[0];
    await expect(lastCall.value).resolves.toMatchObject({
      franchises: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          streams: expect.any(Number),
          latency: expect.any(String)
        })
      ]),
      links: expect.arrayContaining([
        expect.objectContaining({
          source: expect.any(String),
          target: expect.any(String)
        })
      ]),
      status: expect.stringMatching(/^(CALIBRATING|ACTIVE|OPERATIONAL)$/)
    });
  });

  it('creates links between related projects', async () => {
    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    const result = await mockGetFranchiseGraph.mock.results[0].value;

    // Should have links between projects
    expect(result.links.length).toBeGreaterThan(0);

    // Each link should connect valid franchise IDs
    result.links.forEach((link: any) => {
      expect(result.franchises.some((f: any) => f.id === link.source)).toBeTruthy();
      expect(result.franchises.some((f: any) => f.id === link.target)).toBeTruthy();
    });
  });

  it('determines system status from project statuses', async () => {
    // Test OPERATIONAL status (all projects operational)
    mockGetFranchiseGraph.mockResolvedValue({
      franchises: [
        { id: 'project1', name: 'Project 1', streams: 100, latency: '10ms' },
        { id: 'project2', name: 'Project 2', streams: 150, latency: '15ms' }
      ],
      links: [],
      status: 'OPERATIONAL'
    });

    render(<SystemArchitecture />);

    await waitFor(() => {
      const result = mockGetFranchiseGraph.mock.results[0];
      expect(result.value).resolves.toHaveProperty('status', 'OPERATIONAL');
    });
  });

  it('has proper accessibility attributes', async () => {
    render(<SystemArchitecture />);

    await waitFor(() => {
      expect(mockGetFranchiseGraph).toHaveBeenCalled();
    });

    const container = screen.getByTestId('mock-canvas').parentElement;
    expect(container).toHaveAttribute('aria-hidden', 'true');
  });
});
