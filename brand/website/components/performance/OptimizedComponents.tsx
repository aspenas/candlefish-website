'use client';

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Optimized loading states
export const ThreeLoadingState = memo(() => (
  <div className="relative bg-[#1C1C1C] flex items-center justify-center animate-pulse" 
       style={{ height: '600px' }}>
    <div className="text-[#3FD3C6] font-mono text-xs opacity-80">
      <div className="mb-2">LOADING 3D VISUALIZATION...</div>
      <div className="text-[#415A77] text-center">Initializing WebGL Engine</div>
    </div>
  </div>
));

ThreeLoadingState.displayName = 'ThreeLoadingState';

// Optimized header text with memoization
interface OptimizedHeaderTextProps {
  projects?: string[];
  interval?: number;
  className?: string;
}

export const OptimizedHeaderText = memo<OptimizedHeaderTextProps>(({
  projects = [
    'Engraving Automation Platform',
    'Inventory Management System',
    'Workflow Optimization Engine',
    'Process Analytics Dashboard'
  ],
  interval = 4000,
  className = ''
}) => {
  const [currentProject, setCurrentProject] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Memoize the rotation logic
  const rotateProject = useCallback(() => {
    setCurrentProject(prev => (prev + 1) % projects.length);
  }, [projects.length]);

  useEffect(() => {
    intervalRef.current = setInterval(rotateProject, interval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [rotateProject, interval]);

  // Memoize the text spans to avoid recreation
  const projectSpans = useMemo(() => 
    projects.map((project, index) => (
      <span
        key={project}
        className={`absolute inset-0 transition-all duration-1000 ${
          index === currentProject 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-4'
        }`}
      >
        {project}
      </span>
    )), [projects, currentProject]
  );

  return (
    <div className={`relative ${className}`}>
      <h1 className="text-5xl md:text-7xl font-light text-[#F8F8F2] leading-tight mb-8">
        We build impossible
        <br />
        <span className="relative inline-block h-[1.2em] overflow-hidden">
          {projectSpans}
        </span>
      </h1>
    </div>
  );
});

OptimizedHeaderText.displayName = 'OptimizedHeaderText';

// Optimized system activity with performance improvements
interface SystemActivityProps {
  activities?: string[];
  updateInterval?: number;
}

export const OptimizedSystemActivity = memo<SystemActivityProps>(({
  activities = [
    'Analyzing operational patterns...',
    'Processing workflow data...',
    'Optimizing system performance...',
    'Generating efficiency reports...'
  ],
  updateInterval = 3000
}) => {
  const [currentActivity, setCurrentActivity] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Memoize activity rotation
  const rotateActivity = useCallback(() => {
    setCurrentActivity(prev => (prev + 1) % activities.length);
  }, [activities.length]);

  // Intersection observer for performance
  const observerRef = useRef<IntersectionObserver>();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    observerRef.current = observer;

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(rotateActivity, updateInterval);
    return () => clearInterval(interval);
  }, [isVisible, rotateActivity, updateInterval]);

  return (
    <div 
      ref={elementRef}
      className="fixed top-0 left-0 right-0 z-50 bg-[#0D1B2A]/95 backdrop-blur-sm border-b border-[#3FD3C6]/20"
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-2 h-2 bg-[#3FD3C6] rounded-full animate-pulse" />
            <span className="text-[#3FD3C6] text-xs font-mono uppercase tracking-wider">
              WORKSHOP ACTIVE
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-[#415A77] text-xs font-mono">
              {isVisible ? activities[currentActivity] : activities[0]}
            </div>
            <div className="text-[#E0E1DD] text-xs">
              Next Opening: Dec 2025
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

OptimizedSystemActivity.displayName = 'OptimizedSystemActivity';

// Optimized newsletter form with better performance
interface OptimizedNewsletterProps {
  onSubmit?: (email: string) => void;
  placeholder?: string;
  className?: string;
}

export const OptimizedNewsletterForm = memo<OptimizedNewsletterProps>(({
  onSubmit,
  placeholder = "Subscribe for Notifications →",
  className = ""
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(email);
      }
      setIsSubmitted(true);
      setEmail('');
    } catch (error) {
      console.error('Newsletter submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, onSubmit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  // Reset submitted state after delay
  useEffect(() => {
    if (isSubmitted) {
      const timeout = setTimeout(() => setIsSubmitted(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isSubmitted]);

  if (isSubmitted) {
    return (
      <div className={`text-center ${className}`}>
        <div className="inline-flex items-center px-6 py-3 bg-[#3FD3C6]/10 border border-[#3FD3C6]/30 rounded">
          <span className="text-[#3FD3C6] text-sm">
            ✓ Subscribed to workshop notifications
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`max-w-md mx-auto ${className}`}>
      <div className="flex">
        <input
          type="email"
          value={email}
          onChange={handleInputChange}
          placeholder={placeholder}
          required
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-[#1B263B] border border-[#415A77] text-[#E0E1DD] placeholder-[#415A77] focus:border-[#3FD3C6] focus:outline-none transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className="px-6 py-3 bg-[#3FD3C6] text-[#0D1B2A] font-medium hover:bg-[#3FD3C6]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? '...' : '→'}
        </button>
      </div>
    </form>
  );
});

OptimizedNewsletterForm.displayName = 'OptimizedNewsletterForm';

// Performance-optimized intersection observer hook
export function useIntersectionObserver(
  threshold: number = 0.1,
  rootMargin: string = '0px'
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        
        if (intersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      { threshold, rootMargin }
    );

    const element = elementRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
}

// Optimized lazy image component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false
}) => {
  const { elementRef, isIntersecting, hasIntersected } = useIntersectionObserver();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const shouldLoad = priority || isIntersecting || hasIntersected;

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div 
      ref={elementRef as any}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {shouldLoad && !hasError && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
      
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#1B263B] animate-pulse" />
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-[#415A77] flex items-center justify-center">
          <span className="text-[#E0E1DD] text-xs">Failed to load</span>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';