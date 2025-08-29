/**
 * Frontend Performance Optimization
 * Implements virtual scrolling, WebGL acceleration, and code splitting
 * Designed for 60 FPS with large data visualizations
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { VariableSizeList as List } from 'react-window';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { debounce, throttle } from 'lodash';

// ====================
// Virtual Scrolling Component
// ====================

interface VirtualListItem {
  id: string;
  height?: number;
  data: any;
}

interface VirtualScrollProps {
  items: VirtualListItem[];
  renderItem: (item: VirtualListItem, index: number) => React.ReactNode;
  estimatedItemHeight?: number;
  overscan?: number;
  className?: string;
}

export const VirtualScroll: React.FC<VirtualScrollProps> = ({
  items,
  renderItem,
  estimatedItemHeight = 50,
  overscan = 5,
  className,
}) => {
  const listRef = useRef<List>(null);
  const itemHeights = useRef<Map<string, number>>(new Map());
  const [listHeight, setListHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate item height dynamically
  const getItemSize = useCallback(
    (index: number) => {
      const item = items[index];
      return itemHeights.current.get(item.id) || item.height || estimatedItemHeight;
    },
    [items, estimatedItemHeight]
  );

  // Update list height on resize
  useEffect(() => {
    const updateHeight = debounce(() => {
      if (containerRef.current) {
        setListHeight(containerRef.current.clientHeight);
      }
    }, 100);

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Row renderer with height measurement
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];
      const rowRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (rowRef.current && rowRef.current.offsetHeight !== itemHeights.current.get(item.id)) {
          itemHeights.current.set(item.id, rowRef.current.offsetHeight);
          listRef.current?.resetAfterIndex(index);
        }
      }, [item, index]);

      return (
        <div style={style} ref={rowRef}>
          {renderItem(item, index)}
        </div>
      );
    },
    [items, renderItem]
  );

  return (
    <div ref={containerRef} className={className} style={{ height: '100%', width: '100%' }}>
      <List
        ref={listRef}
        height={listHeight}
        itemCount={items.length}
        itemSize={getItemSize}
        width="100%"
        overscanCount={overscan}
      >
        {Row}
      </List>
    </div>
  );
};

// ====================
// WebGL Accelerated Chart Component
// ====================

interface DataPoint {
  x: number;
  y: number;
  z?: number;
  color?: string;
  size?: number;
}

interface WebGLChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  chartType?: 'scatter' | 'line' | 'bar' | 'heatmap';
  showStats?: boolean;
}

const ChartGeometry: React.FC<{ data: DataPoint[]; chartType: string }> = ({ data, chartType }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();

  // Optimize rendering with instanced mesh for large datasets
  const instancedMesh = useMemo(() => {
    if (chartType === 'scatter' || chartType === 'bar') {
      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const mesh = new THREE.InstancedMesh(geometry, material, data.length);

      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();

      data.forEach((point, i) => {
        matrix.setPosition(point.x, point.y, point.z || 0);
        mesh.setMatrixAt(i, matrix);
        
        if (point.color) {
          color.set(point.color);
          mesh.setColorAt(i, color);
        }
      });

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      return mesh;
    }
    return null;
  }, [data, chartType]);

  // Animate on frame
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  if (instancedMesh) {
    return <primitive object={instancedMesh} ref={meshRef} />;
  }

  // Fallback for line charts
  if (chartType === 'line') {
    const points = data.map(p => new THREE.Vector3(p.x, p.y, p.z || 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff });

    return <line geometry={geometry} material={material} />;
  }

  return null;
};

export const WebGLChart: React.FC<WebGLChartProps> = ({
  data,
  width = 800,
  height = 600,
  chartType = 'scatter',
  showStats = false,
}) => {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // Monitor FPS
  useEffect(() => {
    const checkFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime.current + 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      requestAnimationFrame(checkFPS);
    };
    
    const animationId = requestAnimationFrame(checkFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: false,
          stencil: false,
          depth: true,
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <ChartGeometry data={data} chartType={chartType} />
        {showStats && <Stats />}
      </Canvas>
      {showStats && (
        <div style={{ position: 'absolute', top: 10, right: 10, color: 'white' }}>
          FPS: {fps}
        </div>
      )}
    </div>
  );
};

// ====================
// Memory-Efficient Data Grid
// ====================

interface DataGridColumn {
  key: string;
  header: string;
  width?: number;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataGridProps {
  data: any[];
  columns: DataGridColumn[];
  rowHeight?: number;
  onRowClick?: (row: any, index: number) => void;
}

export const OptimizedDataGrid: React.FC<DataGridProps> = ({
  data,
  columns,
  rowHeight = 40,
  onRowClick,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  // Memoize sorted and filtered data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filter
    if (filterText) {
      result = result.filter(row =>
        columns.some(col =>
          String(row[col.key]).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    // Apply sort
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortColumn, sortDirection, filterText, columns]);

  // Handle column sort
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Render row
  const renderRow = useCallback(
    (item: any, index: number) => (
      <div
        className="grid-row"
        style={{
          display: 'flex',
          height: rowHeight,
          borderBottom: '1px solid #e0e0e0',
          cursor: onRowClick ? 'pointer' : 'default',
        }}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map(col => (
          <div
            key={col.key}
            style={{
              width: col.width || `${100 / columns.length}%`,
              padding: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {col.render ? col.render(item[col.key], item) : item[col.key]}
          </div>
        ))}
      </div>
    ),
    [columns, rowHeight, onRowClick]
  );

  return (
    <div className="optimized-data-grid" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter */}
      <div style={{ padding: '8px', borderBottom: '2px solid #e0e0e0' }}>
        <input
          type="text"
          placeholder="Filter..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{ width: '100%', padding: '4px' }}
        />
      </div>

      {/* Headers */}
      <div style={{ display: 'flex', borderBottom: '2px solid #333', fontWeight: 'bold' }}>
        {columns.map(col => (
          <div
            key={col.key}
            style={{
              width: col.width || `${100 / columns.length}%`,
              padding: '8px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => handleSort(col.key)}
          >
            {col.header}
            {sortColumn === col.key && (
              <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
            )}
          </div>
        ))}
      </div>

      {/* Virtual scrolling for data rows */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <VirtualScroll
          items={processedData.map((item, i) => ({ id: String(i), data: item }))}
          renderItem={(item, index) => renderRow(item.data, index)}
          estimatedItemHeight={rowHeight}
        />
      </div>
    </div>
  );
};

// ====================
// Code Splitting and Lazy Loading
// ====================

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('../components/dashboard/SecurityDashboard'));
export const LazyAnalytics = lazy(() => import('../components/analytics/SecurityAnalyticsDashboard'));
export const LazyIncidentResponse = lazy(() => import('../components/incident-response/IncidentResponseWorkflow'));
export const LazyThreatDetection = lazy(() => import('../components/threat-detection/RealTimeThreatDashboard'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <div className="loading-spinner">Loading...</div>
  </div>
);

// Route-based code splitting wrapper
export const LazyRoute: React.FC<{ component: React.LazyExoticComponent<any> }> = ({ component: Component }) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

// ====================
// Performance Monitoring Hook
// ====================

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage: number;
  fps: number;
}

export const usePerformanceMonitor = (componentName: string): PerformanceMetrics => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    fps: 60,
  });

  const renderStart = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(performance.now());

  useEffect(() => {
    renderStart.current = performance.now();

    // Measure render time
    const renderTime = performance.now() - renderStart.current;

    // Count React components
    const componentCount = document.querySelectorAll('[data-react-component]').length;

    // Measure memory usage (if available)
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    // Calculate FPS
    const calculateFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime >= lastFrameTime.current + 1000) {
        const fps = Math.round((frameCount.current * 1000) / (currentTime - lastFrameTime.current));
        frameCount.current = 0;
        lastFrameTime.current = currentTime;
        
        setMetrics({
          renderTime,
          componentCount,
          memoryUsage: memoryUsage / 1024 / 1024, // Convert to MB
          fps,
        });
      }
    };

    const animationId = requestAnimationFrame(function measure() {
      calculateFPS();
      requestAnimationFrame(measure);
    });

    // Log performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        componentCount,
        memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    return () => cancelAnimationFrame(animationId);
  }, [componentName]);

  return metrics;
};

// ====================
// Intersection Observer for Lazy Loading
// ====================

export const useLazyLoad = (
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options?: IntersectionObserverInit
) => {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
        observer.disconnect();
      }
    }, options);

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, callback, options]);
};

// ====================
// WebSocket Connection Optimization
// ====================

class OptimizedWebSocket {
  private ws: WebSocket | null = null;
  private messageQueue: any[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageHandlers = new Map<string, Set<Function>>();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.flushMessageQueue();
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.reconnect();
      };
    });
  }

  private handleMessage(data: any) {
    try {
      // Handle binary data efficiently
      if (data instanceof ArrayBuffer) {
        const view = new DataView(data);
        // Process binary data
        return;
      }

      const message = JSON.parse(data);
      const handlers = this.messageHandlers.get(message.type) || [];
      
      handlers.forEach(handler => {
        // Use requestIdleCallback for non-critical updates
        if (message.priority === 'low') {
          requestIdleCallback(() => handler(message));
        } else {
          handler(message);
        }
      });
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  subscribe(type: string, handler: Function) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  unsubscribe(type: string, handler: Function) {
    this.messageHandlers.get(type)?.delete(handler);
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const useOptimizedWebSocket = (url: string) => {
  const wsRef = useRef<OptimizedWebSocket | null>(null);

  useEffect(() => {
    wsRef.current = new OptimizedWebSocket(url);
    wsRef.current.connect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [url]);

  return wsRef.current;
};

// ====================
// Export Performance Utilities
// ====================

export const PerformanceUtils = {
  // Debounced search input
  createDebouncedSearch: (callback: (value: string) => void, delay = 300) => {
    return debounce(callback, delay);
  },

  // Throttled scroll handler
  createThrottledScroll: (callback: () => void, delay = 100) => {
    return throttle(callback, delay);
  },

  // Request animation frame wrapper
  rafSchedule: (callback: Function) => {
    let scheduled = false;
    return () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          callback();
          scheduled = false;
        });
      }
    };
  },

  // Memory-efficient object pool
  createObjectPool: <T>(factory: () => T, reset: (obj: T) => void, maxSize = 100) => {
    const pool: T[] = [];
    
    return {
      get: () => pool.pop() || factory(),
      release: (obj: T) => {
        if (pool.length < maxSize) {
          reset(obj);
          pool.push(obj);
        }
      },
      size: () => pool.length,
    };
  },
};

export default {
  VirtualScroll,
  WebGLChart,
  OptimizedDataGrid,
  LazyRoute,
  usePerformanceMonitor,
  useLazyLoad,
  useOptimizedWebSocket,
  PerformanceUtils,
};