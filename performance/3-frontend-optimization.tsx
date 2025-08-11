/**
 * Frontend Performance Optimization Components and Utilities
 * Next.js 15 with React 18 optimization patterns
 */

import dynamic from 'next/dynamic';
import { lazy, Suspense, memo, useMemo, useCallback, startTransition } from 'react';
import Image from 'next/image';

// ============================================
// 1. DYNAMIC IMPORTS WITH LOADING STATES
// ============================================

// Heavy components loaded on-demand
export const PDFViewer = dynamic(
  () => import('@/components/PDFViewer').then(mod => mod.PDFViewer),
  {
    loading: () => <PDFViewerSkeleton />,
    ssr: false, // Disable SSR for client-only components
  }
);

export const ChartComponent = dynamic(
  () => import('@/components/ChartComponent'),
  {
    loading: () => <ChartSkeleton />,
    ssr: true,
  }
);

export const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor'),
  {
    loading: () => <EditorSkeleton />,
    ssr: false,
  }
);

// ============================================
// 2. IMAGE OPTIMIZATION COMPONENT
// ============================================

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width = 800,
  height = 600,
  priority = false,
  className = '',
}) => {
  // Generate responsive sizes
  const sizes = useMemo(() => {
    if (width <= 640) return '100vw';
    if (width <= 768) return '(max-width: 640px) 100vw, 640px';
    if (width <= 1024) return '(max-width: 768px) 100vw, (max-width: 1024px) 768px, 1024px';
    return '(max-width: 768px) 100vw, (max-width: 1024px) 768px, (max-width: 1536px) 1024px, 1536px';
  }, [width]);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      placeholder="blur"
      blurDataURL={generateBlurDataURL(width, height)}
      loading={priority ? 'eager' : 'lazy'}
      quality={85}
      formats={['image/avif', 'image/webp']}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Generate blur placeholder
function generateBlurDataURL(width: number, height: number): string {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return '';

  canvas.width = 10;
  canvas.height = Math.round((10 * height) / width);

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL();
}

// ============================================
// 3. VIRTUAL LIST FOR LARGE DATA SETS
// ============================================

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight: number;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight,
  overscan = 3,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    [scrollTop, itemHeight, overscan]
  );

  const endIndex = useMemo(
    () => Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    ),
    [scrollTop, containerHeight, itemHeight, overscan, items.length]
  );

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    startTransition(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 4. OPTIMIZED DATA TABLE COMPONENT
// ============================================

interface DataTableProps {
  data: any[];
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
  }>;
  pageSize?: number;
}

export const OptimizedDataTable = memo<DataTableProps>(({
  data,
  columns,
  pageSize = 50,
}) => {
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Memoized sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Memoized paginated data
  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                {column.label}
                {sortConfig?.key === column.key && (
                  <span className="ml-2">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedData.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {columns.map(column => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.ceil(data.length / pageSize)}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * pageSize >= data.length}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
});

OptimizedDataTable.displayName = 'OptimizedDataTable';

// ============================================
// 5. INTERSECTION OBSERVER FOR LAZY LOADING
// ============================================

interface LazyLoadProps {
  children: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  placeholder?: React.ReactNode;
}

export function LazyLoad({
  children,
  rootMargin = '100px',
  threshold = 0.1,
  placeholder = <div className="animate-pulse bg-gray-200 h-32" />,
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isVisible ? children : placeholder}
    </div>
  );
}

// ============================================
// 6. DEBOUNCED SEARCH INPUT
// ============================================

interface DebouncedSearchProps {
  onSearch: (value: string) => void;
  delay?: number;
  placeholder?: string;
}

export const DebouncedSearch = memo<DebouncedSearchProps>(({
  onSearch,
  delay = 300,
  placeholder = 'Search...',
}) => {
  const [value, setValue] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        onSearch(newValue);
      });
    }, delay);
  }, [onSearch, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
});

DebouncedSearch.displayName = 'DebouncedSearch';

// ============================================
// 7. SKELETON LOADING COMPONENTS
// ============================================

export const PDFViewerSkeleton = () => (
  <div className="w-full h-96 bg-gray-200 animate-pulse rounded-lg" />
);

export const ChartSkeleton = () => (
  <div className="w-full h-64 bg-gray-200 animate-pulse rounded-lg" />
);

export const EditorSkeleton = () => (
  <div className="w-full h-48 bg-gray-200 animate-pulse rounded-lg" />
);

export const CardSkeleton = () => (
  <div className="p-4 bg-white rounded-lg shadow">
    <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2 mb-4" />
    <div className="h-20 bg-gray-200 animate-pulse rounded" />
  </div>
);

// ============================================
// 8. OPTIMIZED FORM WITH FIELD VALIDATION
// ============================================

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  validate?: (value: any) => string | undefined;
}

export const OptimizedForm = memo<{
  fields: FormFieldProps[];
  onSubmit: (data: any) => void;
}>(({ fields, onSubmit }) => {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [touched, setTouched] = useState<any>({});

  const handleChange = useCallback((name: string, value: any) => {
    startTransition(() => {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    });
  }, []);

  const handleBlur = useCallback((name: string) => {
    setTouched((prev: any) => ({ ...prev, [name]: true }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: any = {};

    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'This field is required';
      } else if (field.validate) {
        const error = field.validate(formData[field.name]);
        if (error) newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [validateForm, onSubmit, formData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={field.type || 'text'}
            value={formData[field.name] || ''}
            onChange={e => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            className={`mt-1 block w-full rounded-md border ${
              errors[field.name] && touched[field.name]
                ? 'border-red-500'
                : 'border-gray-300'
            } px-3 py-2`}
          />
          {errors[field.name] && touched[field.name] && (
            <p className="text-red-500 text-sm mt-1">{errors[field.name]}</p>
          )}
        </div>
      ))}
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
});

OptimizedForm.displayName = 'OptimizedForm';

// ============================================
// 9. WEB VITALS MONITORING
// ============================================

export function reportWebVitals(metric: any) {
  const { name, value, id } = metric;

  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      non_interaction: true,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${name}:`, value);
  }

  // Send to monitoring service
  fetch('/api/v1/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, value, id, timestamp: Date.now() }),
  }).catch(() => {
    // Silently fail if metrics endpoint is unavailable
  });
}
