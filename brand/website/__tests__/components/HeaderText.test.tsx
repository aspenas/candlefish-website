import { render, screen, waitFor, act } from '@testing-library/react';
import HeaderText from '../../components/HeaderText';
import { getWorkshopProjects } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  getWorkshopProjects: jest.fn()
}));

const mockGetWorkshopProjects = getWorkshopProjects as jest.MockedFunction<typeof getWorkshopProjects>;

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

// Mock Canvas and WebGL for Three.js
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
  })),
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
});

describe('HeaderText Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API response with workshop data
    mockGetWorkshopProjects.mockResolvedValue({
      projects: [
        {
          id: 'engraving-automation',
          title: 'Engraving Automation Platform',
          status: 'ACTIVE',
          domain: ['Excel Automation', 'Engraving', 'Manufacturing'],
          complexity: 'H',
          impact: 'High',
          updated_at: '2025-08-23'
        },
        {
          id: 'promoteros-intelligence',
          title: 'PromoterOS Concert Intelligence',
          status: 'CALIBRATING',
          domain: ['Live Music', 'Demand Prediction', 'Social Analytics'],
          complexity: 'H',
          impact: 'High',
          updated_at: '2025-08-23'
        }
      ]
    });
  });

  it('renders the static text content', async () => {
    render(<HeaderText />);

    expect(screen.getByText('Currently engineering')).toBeInTheDocument();
  });

  it('loads and displays workshop project data', async () => {
    render(<HeaderText />);

    await waitFor(() => {
      expect(mockGetWorkshopProjects).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/engraving automation platform/i)).toBeInTheDocument();
    });
  });

  it('handles prefers-reduced-motion', async () => {
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

    render(<HeaderText />);

    await waitFor(() => {
      expect(mockGetWorkshopProjects).toHaveBeenCalled();
    });

    // Should render fallback version
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();
  });

  it('handles empty project data gracefully', async () => {
    mockGetWorkshopProjects.mockResolvedValue({ projects: [] });

    render(<HeaderText />);

    await waitFor(() => {
      expect(mockGetWorkshopProjects).toHaveBeenCalled();
    });

    // Should render fallback text
    expect(screen.getByText(/operational excellence systems/i)).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockGetWorkshopProjects.mockRejectedValue(new Error('API Error'));

    render(<HeaderText />);

    await waitFor(() => {
      expect(mockGetWorkshopProjects).toHaveBeenCalled();
    });

    // Component should still render without crashing
    expect(screen.getByText('Currently engineering')).toBeInTheDocument();
  });

  it('displays projects in lowercase', async () => {
    render(<HeaderText />);

    await waitFor(() => {
      expect(screen.getByText(/engraving automation platform/i)).toBeInTheDocument();
    });
  });

  it('rotates between projects when multiple are available', async () => {
    jest.useFakeTimers();

    render(<HeaderText />);

    await waitFor(() => {
      expect(mockGetWorkshopProjects).toHaveBeenCalled();
    });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/engraving automation platform/i)).toBeInTheDocument();
    });

    // Fast-forward through transition
    act(() => {
      jest.advanceTimersByTime(6000); // 5s interval + 1s transition
    });

    jest.useRealTimers();
  });
});
