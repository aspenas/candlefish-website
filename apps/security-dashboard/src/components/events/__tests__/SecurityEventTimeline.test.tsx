import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import SecurityEventTimeline from '../SecurityEventTimeline';
import { createMockSecurityEvents, mockSecurityEventData } from '@/test/factories/ThreatFactory';

// Mock D3 timeline component
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(),
            style: vi.fn(),
            text: vi.fn(),
          })),
        })),
        exit: vi.fn(() => ({
          remove: vi.fn(),
        })),
      })),
    })),
    append: vi.fn(() => ({
      attr: vi.fn(),
      style: vi.fn(),
    })),
    attr: vi.fn(),
    style: vi.fn(),
  })),
  scaleTime: vi.fn(() => ({
    domain: vi.fn(() => ({
      range: vi.fn(),
    })),
    range: vi.fn(),
  })),
  scaleOrdinal: vi.fn(() => ({
    domain: vi.fn(),
    range: vi.fn(),
  })),
  axisBottom: vi.fn(() => ({
    tickFormat: vi.fn(),
  })),
  extent: vi.fn(() => [new Date(), new Date()]),
}));

describe('SecurityEventTimeline', () => {
  const mockEvents = createMockSecurityEvents(10);
  const defaultProps = {
    events: mockEvents,
    isLoading: false,
    height: 400,
    onEventClick: vi.fn(),
    onTimeRangeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(<SecurityEventTimeline {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('timeline-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading timeline...')).toBeInTheDocument();
  });

  it('renders timeline with events', () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    expect(screen.getByTestId('security-event-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-svg')).toBeInTheDocument();
  });

  it('displays empty state when no events', () => {
    render(<SecurityEventTimeline {...defaultProps} events={[]} />);

    expect(screen.getByTestId('timeline-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No security events found')).toBeInTheDocument();
  });

  it('filters events by severity', async () => {
    const criticalEvent = mockSecurityEventData({ severity: 'CRITICAL' });
    const lowEvent = mockSecurityEventData({ severity: 'LOW' });
    const events = [criticalEvent, lowEvent];

    render(<SecurityEventTimeline {...defaultProps} events={events} />);

    const severityFilter = screen.getByLabelText('Filter by severity');
    fireEvent.change(severityFilter, { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      expect(screen.getByTestId('filtered-events-count')).toHaveTextContent('1');
    });
  });

  it('filters events by event type', async () => {
    const malwareEvent = mockSecurityEventData({ event_type: 'MALWARE_DETECTED' });
    const phishingEvent = mockSecurityEventData({ event_type: 'PHISHING_ATTEMPT' });
    const events = [malwareEvent, phishingEvent];

    render(<SecurityEventTimeline {...defaultProps} events={events} />);

    const typeFilter = screen.getByLabelText('Filter by event type');
    fireEvent.change(typeFilter, { target: { value: 'MALWARE_DETECTED' } });

    await waitFor(() => {
      expect(screen.getByTestId('filtered-events-count')).toHaveTextContent('1');
    });
  });

  it('handles time range selection', async () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    const timeRangeSelector = screen.getByLabelText('Select time range');
    fireEvent.change(timeRangeSelector, { target: { value: '24h' } });

    await waitFor(() => {
      expect(defaultProps.onTimeRangeChange).toHaveBeenCalledWith('24h');
    });
  });

  it('calls onEventClick when event is clicked', async () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    // Simulate clicking on a timeline event
    const timelineEvent = screen.getByTestId(`event-${mockEvents[0].id}`);
    fireEvent.click(timelineEvent);

    await waitFor(() => {
      expect(defaultProps.onEventClick).toHaveBeenCalledWith(mockEvents[0]);
    });
  });

  it('displays event details in tooltip on hover', async () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    const timelineEvent = screen.getByTestId(`event-${mockEvents[0].id}`);
    fireEvent.mouseEnter(timelineEvent);

    await waitFor(() => {
      expect(screen.getByTestId('event-tooltip')).toBeInTheDocument();
      expect(screen.getByText(mockEvents[0].event_type)).toBeInTheDocument();
      expect(screen.getByText(mockEvents[0].description)).toBeInTheDocument();
    });

    // Hide tooltip on mouse leave
    fireEvent.mouseLeave(timelineEvent);

    await waitFor(() => {
      expect(screen.queryByTestId('event-tooltip')).not.toBeInTheDocument();
    });
  });

  it('zooms timeline on wheel scroll', async () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    const timeline = screen.getByTestId('timeline-svg');
    
    // Zoom in
    fireEvent.wheel(timeline, { deltaY: -100 });

    await waitFor(() => {
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('110%');
    });

    // Zoom out
    fireEvent.wheel(timeline, { deltaY: 100 });

    await waitFor(() => {
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');
    });
  });

  it('pans timeline on drag', async () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    const timeline = screen.getByTestId('timeline-svg');
    
    fireEvent.mouseDown(timeline, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(timeline, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(timeline);

    await waitFor(() => {
      expect(screen.getByTestId('pan-offset')).toHaveTextContent('50px');
    });
  });

  it('groups events by time period', async () => {
    const events = [
      mockSecurityEventData({ timestamp: new Date('2024-01-01T10:00:00Z').toISOString() }),
      mockSecurityEventData({ timestamp: new Date('2024-01-01T10:30:00Z').toISOString() }),
      mockSecurityEventData({ timestamp: new Date('2024-01-01T11:00:00Z').toISOString() }),
    ];

    render(<SecurityEventTimeline {...defaultProps} events={events} />);

    const groupingSelect = screen.getByLabelText('Group events by');
    fireEvent.change(groupingSelect, { target: { value: 'hour' } });

    await waitFor(() => {
      expect(screen.getAllByTestId(/event-group-/)).toHaveLength(2);
    });
  });

  it('exports timeline data', async () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.createObjectURL = mockCreateObjectURL;
    
    render(<SecurityEventTimeline {...defaultProps} />);

    const exportButton = screen.getByText('Export Timeline');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  it('supports keyboard navigation', async () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    const timeline = screen.getByTestId('timeline-svg');
    timeline.focus();

    // Navigate to first event with arrow keys
    fireEvent.keyDown(timeline, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByTestId('selected-event')).toHaveTextContent(mockEvents[0].id);
    });

    // Select event with Enter
    fireEvent.keyDown(timeline, { key: 'Enter' });

    await waitFor(() => {
      expect(defaultProps.onEventClick).toHaveBeenCalledWith(mockEvents[0]);
    });
  });

  it('displays severity color coding', () => {
    const events = [
      mockSecurityEventData({ severity: 'CRITICAL' }),
      mockSecurityEventData({ severity: 'HIGH' }),
      mockSecurityEventData({ severity: 'MEDIUM' }),
      mockSecurityEventData({ severity: 'LOW' }),
    ];

    render(<SecurityEventTimeline {...defaultProps} events={events} />);

    expect(screen.getByTestId('event-critical')).toHaveClass('severity-critical');
    expect(screen.getByTestId('event-high')).toHaveClass('severity-high');
    expect(screen.getByTestId('event-medium')).toHaveClass('severity-medium');
    expect(screen.getByTestId('event-low')).toHaveClass('severity-low');
  });

  it('shows event correlation lines', () => {
    const correlatedEvents = [
      mockSecurityEventData({ correlation_id: 'corr-123' }),
      mockSecurityEventData({ correlation_id: 'corr-123' }),
    ];

    render(<SecurityEventTimeline {...defaultProps} events={correlatedEvents} />);

    expect(screen.getByTestId('correlation-line-corr-123')).toBeInTheDocument();
  });

  it('handles real-time event updates', async () => {
    const { rerender } = render(<SecurityEventTimeline {...defaultProps} />);

    const newEvent = mockSecurityEventData();
    const updatedEvents = [...mockEvents, newEvent];

    rerender(<SecurityEventTimeline {...defaultProps} events={updatedEvents} />);

    await waitFor(() => {
      expect(screen.getByTestId(`event-${newEvent.id}`)).toBeInTheDocument();
    });
  });

  it('displays timeline controls', () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    expect(screen.getByLabelText('Play timeline')).toBeInTheDocument();
    expect(screen.getByLabelText('Pause timeline')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset timeline')).toBeInTheDocument();
    expect(screen.getByLabelText('Timeline speed')).toBeInTheDocument();
  });

  it('animates timeline playback', async () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    const playButton = screen.getByLabelText('Play timeline');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByTestId('timeline-playing')).toBeInTheDocument();
    });

    const pauseButton = screen.getByLabelText('Pause timeline');
    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(screen.queryByTestId('timeline-playing')).not.toBeInTheDocument();
    });
  });

  it('handles custom height prop', () => {
    render(<SecurityEventTimeline {...defaultProps} height={600} />);

    const timeline = screen.getByTestId('timeline-svg');
    expect(timeline).toHaveAttribute('height', '600');
  });

  it('displays event statistics', () => {
    render(<SecurityEventTimeline {...defaultProps} />);

    expect(screen.getByTestId('timeline-stats')).toBeInTheDocument();
    expect(screen.getByText(`${mockEvents.length} events`)).toBeInTheDocument();
  });
});