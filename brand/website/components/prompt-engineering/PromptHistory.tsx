'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PromptResponse, PromptRequest } from '@/lib/prompt-engineering/types';

interface PromptHistoryProps {
  detailed?: boolean;
  limit?: number;
  className?: string;
  onReplay?: (request: PromptRequest) => void;
}

interface HistoryState {
  history: PromptResponse[];
  filteredHistory: PromptResponse[];
  selectedItem: PromptResponse | null;
  searchQuery: string;
  filterStatus: 'all' | 'success' | 'error';
  sortBy: 'timestamp' | 'cost' | 'latency' | 'quality';
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  itemsPerPage: number;
  isLoading: boolean;
}

// Mock data for demonstration
const MOCK_HISTORY: PromptResponse[] = [
  {
    id: '1',
    templateId: 'code-review-automated',
    model: 'claude-opus-4-1-20250805',
    provider: 'anthropic',
    prompt: 'Review this code for security issues...',
    response: 'I found several security concerns in this code...',
    tokensUsed: { prompt: 150, completion: 300, total: 450 },
    latency: 2400,
    cost: 0.0067,
    quality: {
      accuracy: 0.95,
      relevance: 0.92,
      coherence: 0.98,
      completeness: 0.89,
      overall: 0.935,
    },
    cached: false,
    timestamp: new Date(Date.now() - 3600000),
    traceId: 'trace-1',
  },
  {
    id: '2',
    templateId: 'test-generation-unit',
    model: 'gpt-4o',
    provider: 'openai',
    prompt: 'Generate unit tests for this function...',
    response: 'Here are comprehensive unit tests...',
    tokensUsed: { prompt: 200, completion: 600, total: 800 },
    latency: 1800,
    cost: 0.004,
    quality: {
      accuracy: 0.88,
      relevance: 0.94,
      coherence: 0.91,
      completeness: 0.96,
      overall: 0.922,
    },
    cached: true,
    timestamp: new Date(Date.now() - 7200000),
    traceId: 'trace-2',
  },
  {
    id: '3',
    templateId: 'documentation-auto-generator',
    model: 'claude-sonnet-3-5-20241022',
    provider: 'anthropic',
    prompt: 'Generate API documentation...',
    response: 'Complete API documentation with examples...',
    tokensUsed: { prompt: 300, completion: 1200, total: 1500 },
    latency: 3200,
    cost: 0.0045,
    error: {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded',
      retryable: true,
      timestamp: new Date(),
    },
    cached: false,
    timestamp: new Date(Date.now() - 10800000),
    traceId: 'trace-3',
  },
];

export const PromptHistory: React.FC<PromptHistoryProps> = ({
  detailed = false,
  limit,
  className = '',
  onReplay,
}) => {
  const [state, setState] = useState<HistoryState>({
    history: MOCK_HISTORY,
    filteredHistory: MOCK_HISTORY,
    selectedItem: null,
    searchQuery: '',
    filterStatus: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: limit || 10,
    isLoading: false,
  });

  // Filter and sort history
  useEffect(() => {
    let filtered = state.history;

    // Apply search filter
    if (state.searchQuery) {
      filtered = filtered.filter(item =>
        item.templateId.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        item.response.toLowerCase().includes(state.searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (state.filterStatus !== 'all') {
      filtered = filtered.filter(item =>
        state.filterStatus === 'success' ? !item.error : !!item.error
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortBy) {
        case 'timestamp':
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case 'cost':
          aValue = a.cost;
          bValue = b.cost;
          break;
        case 'latency':
          aValue = a.latency;
          bValue = b.latency;
          break;
        case 'quality':
          aValue = a.quality?.overall || 0;
          bValue = b.quality?.overall || 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      return state.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    setState(prev => ({ ...prev, filteredHistory: filtered }));
  }, [state.history, state.searchQuery, state.filterStatus, state.sortBy, state.sortOrder]);

  const handleItemClick = (item: PromptResponse) => {
    setState(prev => ({ 
      ...prev, 
      selectedItem: prev.selectedItem?.id === item.id ? null : item 
    }));
  };

  const handleReplay = (item: PromptResponse) => {
    if (!onReplay) return;
    
    // Reconstruct the original request from the response
    const request: PromptRequest = {
      templateId: item.templateId,
      variables: {}, // Would need to be stored with the response
      modelConfig: {
        provider: item.provider,
        model: item.model,
      },
      traceId: `replay-${Date.now()}`,
    };
    
    onReplay(request);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusColor = (item: PromptResponse) => {
    if (item.error) return 'text-red-600';
    if (item.quality?.overall && item.quality.overall > 0.9) return 'text-green-600';
    if (item.quality?.overall && item.quality.overall > 0.7) return 'text-yellow-600';
    return 'text-ink-primary';
  };

  const paginatedHistory = state.filteredHistory.slice(
    (state.currentPage - 1) * state.itemsPerPage,
    state.currentPage * state.itemsPerPage
  );

  const totalPages = Math.ceil(state.filteredHistory.length / state.itemsPerPage);

  return (
    <Card className={className}>
      <div className="p-4 border-b border-atelier-structure">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-ink-primary">
            {detailed ? 'Execution History' : 'Recent History'}
          </h3>
          {state.isLoading && <LoadingSpinner size="sm" />}
        </div>

        {/* Filters */}
        {detailed && (
          <div className="flex flex-wrap items-center gap-4">
            <Input
              placeholder="Search history..."
              value={state.searchQuery}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="max-w-64"
            />
            
            <select
              value={state.filterStatus}
              onChange={(e) => setState(prev => ({ ...prev, filterStatus: e.target.value as any }))}
              className="px-3 py-2 text-sm border border-atelier-structure rounded bg-atelier-canvas"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
            
            <select
              value={`${state.sortBy}-${state.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setState(prev => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any }));
              }}
              className="px-3 py-2 text-sm border border-atelier-structure rounded bg-atelier-canvas"
            >
              <option value="timestamp-desc">Latest First</option>
              <option value="timestamp-asc">Oldest First</option>
              <option value="cost-desc">Highest Cost</option>
              <option value="cost-asc">Lowest Cost</option>
              <option value="latency-desc">Slowest</option>
              <option value="latency-asc">Fastest</option>
              <option value="quality-desc">Best Quality</option>
              <option value="quality-asc">Worst Quality</option>
            </select>
          </div>
        )}
      </div>

      <div className="divide-y divide-atelier-structure">
        {paginatedHistory.map((item) => (
          <div key={item.id} className="hover:bg-atelier-structure/10 transition-colors">
            <div 
              className="p-4 cursor-pointer"
              onClick={() => handleItemClick(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-ink-primary">
                      {item.templateId}
                    </span>
                    <Badge variant="outline" size="xs" className="capitalize">
                      {item.provider}
                    </Badge>
                    <Badge variant="outline" size="xs">
                      {item.model}
                    </Badge>
                    {item.cached && (
                      <Badge variant="success" size="xs">Cached</Badge>
                    )}
                    {item.error && (
                      <Badge variant="error" size="xs">Error</Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-ink-secondary line-clamp-2">
                    {item.error ? item.error.message : item.response.substring(0, 100) + '...'}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs text-ink-secondary ml-4">
                  <div className="text-right">
                    <div>{formatRelativeTime(item.timestamp)}</div>
                    <div className="font-mono">${item.cost.toFixed(4)}</div>
                  </div>
                  <div className="text-right">
                    <div>{item.latency}ms</div>
                    <div className="font-mono">{item.tokensUsed.total}t</div>
                  </div>
                  {item.quality && (
                    <div className={`text-right ${getStatusColor(item)}`}>
                      {(item.quality.overall * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {state.selectedItem?.id === item.id && (
              <div className="px-4 pb-4 bg-atelier-structure/5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Request Details */}
                  <div>
                    <h4 className="font-medium text-ink-primary mb-2">Request</h4>
                    <div className="bg-atelier-canvas rounded p-3 text-sm">
                      <div className="whitespace-pre-wrap font-mono text-ink-secondary">
                        {item.prompt.substring(0, 200)}
                        {item.prompt.length > 200 && '...'}
                      </div>
                    </div>
                  </div>

                  {/* Response Details */}
                  <div>
                    <h4 className="font-medium text-ink-primary mb-2">Response</h4>
                    <div className="bg-atelier-canvas rounded p-3 text-sm max-h-32 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-ink-secondary">
                        {item.error ? (
                          <span className="text-red-600">{item.error.message}</span>
                        ) : (
                          item.response
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality Metrics */}
                {item.quality && (
                  <div className="mt-4">
                    <h4 className="font-medium text-ink-primary mb-2">Quality Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {Object.entries(item.quality).map(([key, value]) => 
                        typeof value === 'number' && key !== 'overall' && (
                          <div key={key} className="text-center">
                            <div className="text-xs text-ink-secondary capitalize mb-1">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="text-sm font-mono text-ink-primary">
                              {(value * 100).toFixed(0)}%
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-atelier-structure">
                  <div className="flex items-center space-x-4 text-xs text-ink-secondary">
                    <span>ID: {item.id}</span>
                    {item.traceId && <span>Trace: {item.traceId}</span>}
                    <span>{item.timestamp.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {onReplay && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReplay(item)}
                      >
                        Replay
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {detailed && totalPages > 1 && (
        <div className="p-4 border-t border-atelier-structure flex items-center justify-between">
          <div className="text-sm text-ink-secondary">
            Showing {((state.currentPage - 1) * state.itemsPerPage) + 1} to{' '}
            {Math.min(state.currentPage * state.itemsPerPage, state.filteredHistory.length)} of{' '}
            {state.filteredHistory.length} entries
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={state.currentPage === 1}
              onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setState(prev => ({ ...prev, currentPage: page }))}
                    className={`px-3 py-1 text-sm rounded ${
                      page === state.currentPage
                        ? 'bg-operation-active text-white'
                        : 'text-ink-secondary hover:text-ink-primary hover:bg-atelier-structure/20'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              disabled={state.currentPage === totalPages}
              onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {paginatedHistory.length === 0 && (
        <div className="p-8 text-center text-ink-secondary">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No execution history found</p>
          <p className="text-xs mt-1">Execute some prompts to see history here</p>
        </div>
      )}
    </Card>
  );
};