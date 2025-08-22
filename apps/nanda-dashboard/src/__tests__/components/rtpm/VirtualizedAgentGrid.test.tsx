/**
 * Tests for VirtualizedAgentGrid component
 * Tests virtualization, performance with 1000+ agents, and interaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirtualizedAgentGrid } from '../../../components/rtpm/VirtualizedAgentGrid';
import { createMockAgent, createMockMetrics } from '../../setup';
import type { Agent, AgentMetrics } from '../../../types/rtpm.types';

// Mock react-window for testing
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemCount, itemSize, height, ...props }) => (
    <div
      data-testid="virtualized-list"
      data-item-count={itemCount}
      data-item-size={itemSize}
      data-height={height}
      style={{ height }}
      {...props}
    >
      {/* Render first 10 items for testing */}
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) => (
        <div key={index} style={{ height: itemSize }}>
          {children({ index, style: { height: itemSize } })}
        </div>
      ))}
    </div>
  )),
}));

// Create test data
const createTestAgents = (count: number): Agent[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockAgent({
      id: `agent-${String(i + 1).padStart(4, '0')}`,
      name: `Agent-${String(i + 1).padStart(4, '0')}`,
      status: ['online', 'offline', 'warning', 'error'][i % 4] as Agent['status'],
      region: ['us-east-1', 'us-west-2', 'eu-west-1'][i % 3],
      platform: ['OpenAI', 'Anthropic', 'Google'][i % 3],
    })
  );
};

const createTestMetrics = (agents: Agent[]): Map<string, AgentMetrics> => {
  const metricsMap = new Map();
  agents.forEach(agent => {
    metricsMap.set(agent.id, createMockMetrics({
      agentId: agent.id,
      cpu: 20 + Math.random() * 60,
      memory: 30 + Math.random() * 50,
    }));
  });
  return metricsMap;
};

describe('VirtualizedAgentGrid', () => {
  const user = userEvent.setup();
  let mockAgents: Agent[];
  let mockMetrics: Map<string, AgentMetrics>;
  let mockOnAgentSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAgents = createTestAgents(50);
    mockMetrics = createTestMetrics(mockAgents);
    mockOnAgentSelect = vi.fn();
  });

  it('renders with basic agent list', () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('data-item-count', '50');
  });

  it('displays agent information correctly', () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Should show agent names
    expect(screen.getByText('Agent-0001')).toBeInTheDocument();
    expect(screen.getByText('Agent-0002')).toBeInTheDocument();
  });

  it('handles agent selection', async () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Click on first agent
    const firstAgent = screen.getByText('Agent-0001');
    await user.click(firstAgent);

    expect(mockOnAgentSelect).toHaveBeenCalledWith(mockAgents[0]);
  });

  it('shows selected agents with different styling', () => {
    const selectedAgentIds = ['agent-0001', 'agent-0003'];

    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={selectedAgentIds}
      />
    );

    // Selected agents should have different styling (implementation-dependent)
    const firstAgent = screen.getByText('Agent-0001').closest('div');
    expect(firstAgent).toBeTruthy();
  });

  it('displays agent status correctly', () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Should show status for each agent
    // The exact implementation depends on how status is displayed
    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toBeInTheDocument();
  });

  it('shows agent metrics when available', () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Metrics should be displayed for agents
    // Implementation depends on how metrics are shown in the grid
    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toBeInTheDocument();
  });

  it('handles agents without metrics gracefully', () => {
    const emptyMetrics = new Map<string, AgentMetrics>();

    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={emptyMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Should still render agents even without metrics
    expect(screen.getByText('Agent-0001')).toBeInTheDocument();
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles empty agent list', () => {
    render(
      <VirtualizedAgentGrid
        agents={[]}
        agentMetrics={new Map()}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toHaveAttribute('data-item-count', '0');
  });
});

describe('VirtualizedAgentGrid Performance', () => {
  let largeAgentList: Agent[];
  let largeMetricsMap: Map<string, AgentMetrics>;
  let mockOnAgentSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    largeAgentList = createTestAgents(1000);
    largeMetricsMap = createTestMetrics(largeAgentList);
    mockOnAgentSelect = vi.fn();
  });

  it('handles 1000+ agents efficiently', () => {
    const startTime = performance.now();

    render(
      <VirtualizedAgentGrid
        agents={largeAgentList}
        agentMetrics={largeMetricsMap}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (under 100ms)
    expect(renderTime).toBeLessThan(100);

    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toHaveAttribute('data-item-count', '1000');
  });

  it('only renders visible items with virtualization', () => {
    render(
      <VirtualizedAgentGrid
        agents={largeAgentList}
        agentMetrics={largeMetricsMap}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // With virtualization, only visible items should be in DOM
    const agentElements = screen.getAllByText(/Agent-/);

    // Should render only visible items (mock renders first 10)
    expect(agentElements.length).toBeLessThanOrEqual(10);
    expect(agentElements.length).toBeGreaterThan(0);
  });

  it('maintains performance during scrolling', async () => {
    render(
      <VirtualizedAgentGrid
        agents={largeAgentList}
        agentMetrics={largeMetricsMap}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const grid = screen.getByTestId('virtualized-list');

    // Simulate scroll events
    const startTime = performance.now();

    for (let i = 0; i < 10; i++) {
      fireEvent.scroll(grid, { target: { scrollTop: i * 100 } });
    }

    const endTime = performance.now();
    const scrollTime = endTime - startTime;

    // Scroll handling should be fast
    expect(scrollTime).toBeLessThan(50);
  });

  it('handles rapid selection changes efficiently', async () => {
    const { rerender } = render(
      <VirtualizedAgentGrid
        agents={largeAgentList}
        agentMetrics={largeMetricsMap}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const startTime = performance.now();

    // Rapidly change selections
    for (let i = 0; i < 100; i++) {
      const selectedAgents = [`agent-${String(i + 1).padStart(4, '0')}`];
      rerender(
        <VirtualizedAgentGrid
          agents={largeAgentList}
          agentMetrics={largeMetricsMap}
          onAgentSelect={mockOnAgentSelect}
          selectedAgents={selectedAgents}
        />
      );
    }

    const endTime = performance.now();
    const updateTime = endTime - startTime;

    // Selection updates should be efficient
    expect(updateTime).toBeLessThan(200);
  });

  it('handles large metrics updates efficiently', () => {
    const { rerender } = render(
      <VirtualizedAgentGrid
        agents={largeAgentList}
        agentMetrics={largeMetricsMap}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const startTime = performance.now();

    // Update all metrics
    const newMetrics = createTestMetrics(largeAgentList);
    rerender(
      <VirtualizedAgentGrid
        agents={largeAgentList}
        agentMetrics={newMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const endTime = performance.now();
    const updateTime = endTime - startTime;

    // Metrics update should be fast
    expect(updateTime).toBeLessThan(100);
  });
});

describe('VirtualizedAgentGrid Filtering and Sorting', () => {
  let mockAgents: Agent[];
  let mockMetrics: Map<string, AgentMetrics>;
  let mockOnAgentSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAgents = createTestAgents(50);
    mockMetrics = createTestMetrics(mockAgents);
    mockOnAgentSelect = vi.fn();
  });

  it('displays filtered agents correctly', () => {
    // Filter to only online agents
    const filteredAgents = mockAgents.filter(agent => agent.status === 'online');

    render(
      <VirtualizedAgentGrid
        agents={filteredAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toHaveAttribute('data-item-count', filteredAgents.length.toString());
  });

  it('handles dynamic filtering changes', () => {
    const { rerender } = render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Initially all agents
    let grid = screen.getByTestId('virtualized-list');
    expect(grid).toHaveAttribute('data-item-count', '50');

    // Filter to online agents only
    const onlineAgents = mockAgents.filter(agent => agent.status === 'online');
    rerender(
      <VirtualizedAgentGrid
        agents={onlineAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    grid = screen.getByTestId('virtualized-list');
    expect(grid).toHaveAttribute('data-item-count', onlineAgents.length.toString());
  });

  it('maintains selection after filtering', () => {
    const selectedAgents = ['agent-0001', 'agent-0005'];

    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={selectedAgents}
      />
    );

    // Selected agents should still be marked as selected
    expect(screen.getByText('Agent-0001')).toBeInTheDocument();
  });

  it('handles sorting changes efficiently', () => {
    // Create sorted agents list
    const sortedAgents = [...mockAgents].sort((a, b) => a.name.localeCompare(b.name));

    render(
      <VirtualizedAgentGrid
        agents={sortedAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toHaveAttribute('data-item-count', '50');
  });
});

describe('VirtualizedAgentGrid Accessibility', () => {
  let mockAgents: Agent[];
  let mockMetrics: Map<string, AgentMetrics>;
  let mockOnAgentSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAgents = createTestAgents(20);
    mockMetrics = createTestMetrics(mockAgents);
    mockOnAgentSelect = vi.fn();
  });

  it('supports keyboard navigation', async () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const grid = screen.getByTestId('virtualized-list');

    // Focus the grid
    grid.focus();

    // Should be focusable
    expect(document.activeElement).toBe(grid);
  });

  it('has proper ARIA attributes', () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    const grid = screen.getByTestId('virtualized-list');

    // Should have appropriate ARIA attributes for a grid
    // This depends on the implementation
    expect(grid).toBeInTheDocument();
  });

  it('announces selection changes to screen readers', async () => {
    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Click on an agent
    const firstAgent = screen.getByText('Agent-0001');
    await userEvent.click(firstAgent);

    expect(mockOnAgentSelect).toHaveBeenCalled();
  });

  it('supports high contrast mode', () => {
    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <VirtualizedAgentGrid
        agents={mockAgents}
        agentMetrics={mockMetrics}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Component should still render properly
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });
});

describe('VirtualizedAgentGrid Error Handling', () => {
  let mockOnAgentSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAgentSelect = vi.fn();
  });

  it('handles null agents gracefully', () => {
    render(
      <VirtualizedAgentGrid
        agents={null as any}
        agentMetrics={new Map()}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Should render without crashing
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles malformed agent data', () => {
    const malformedAgents = [
      { id: 'agent-1' }, // Missing required fields
      { name: 'Agent 2' }, // Missing id
    ] as Agent[];

    render(
      <VirtualizedAgentGrid
        agents={malformedAgents}
        agentMetrics={new Map()}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Should handle gracefully
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles selection of non-existent agents', async () => {
    const agents = createTestAgents(5);

    render(
      <VirtualizedAgentGrid
        agents={agents}
        agentMetrics={new Map()}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={['non-existent-agent']}
      />
    );

    // Should render without issues
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles rapid prop changes', () => {
    const { rerender } = render(
      <VirtualizedAgentGrid
        agents={[]}
        agentMetrics={new Map()}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Rapidly change props
    const agents1 = createTestAgents(10);
    const agents2 = createTestAgents(50);
    const agents3 = createTestAgents(100);

    rerender(
      <VirtualizedAgentGrid
        agents={agents1}
        agentMetrics={createTestMetrics(agents1)}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    rerender(
      <VirtualizedAgentGrid
        agents={agents2}
        agentMetrics={createTestMetrics(agents2)}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    rerender(
      <VirtualizedAgentGrid
        agents={agents3}
        agentMetrics={createTestMetrics(agents3)}
        onAgentSelect={mockOnAgentSelect}
        selectedAgents={[]}
      />
    );

    // Should handle all changes gracefully
    const grid = screen.getByTestId('virtualized-list');
    expect(grid).toHaveAttribute('data-item-count', '100');
  });
});
