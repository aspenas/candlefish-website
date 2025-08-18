import dynamic from 'next/dynamic';
import { ComponentType, lazy, Suspense } from 'react';

// Loading component for dynamic imports
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

// Excel Engine - Heavy calculation components
export const ExcelEngine = dynamic(
  () => import('@/lib/excel-engine/formula-engine').then(mod => ({ default: mod.FormulaEngine })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Chart Components - Load on demand
export const ChartComponent = dynamic(
  () => import('react-chartjs-2').then(mod => mod),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// PDF Components - Load when needed
export const PDFGenerator = dynamic(
  () => import('@/components/production/PDFGenerator'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Company Cam Integration - Load on demand
export const CompanyCamViewer = dynamic(
  () => import('@/components/integrations/CompanyCamViewer'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Production Workflow Components
export const ProductionWorkflow = dynamic(
  () => import('@/components/production/ProductionWorkflow'),
  {
    loading: () => <LoadingSpinner />,
  }
);

// Heavy UI Components
export const DataTable = dynamic(
  () => import('@/components/ui/data-table'),
  {
    loading: () => <LoadingSpinner />,
  }
);

export const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Salesforce Components
export const SalesforceSync = dynamic(
  () => import('@/components/integrations/SalesforceSync'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Analytics Components
export const AnalyticsDashboard = dynamic(
  () => import('@/components/analytics/Dashboard'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Helper function for lazy loading with error boundary
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error;

        // If chunk load error, try to reload
        if (error instanceof Error && error.message.includes('Loading chunk')) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  });
}

// Progressive image loading component
export const ProgressiveImage = dynamic(
  () => import('@/components/ui/progressive-image'),
  {
    loading: () => <div className="bg-gray-200 animate-pulse" />,
  }
);

// Heavy calculation utilities - load in Web Worker
export const loadCalculationWorker = () => {
  if (typeof window !== 'undefined' && window.Worker) {
    return new Worker(new URL('../workers/calculation.worker.ts', import.meta.url));
  }
  return null;
};

// Preload critical components
export const preloadComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload critical components after initial render
    setTimeout(() => {
      import('@/components/production/ProductionWorkflow');
      import('@/lib/excel-engine/formula-engine');
    }, 2000);
  }
};

// Bundle size optimization utilities
export const loadHeavyLibrary = async (library: string) => {
  switch (library) {
    case 'xlsx':
      return import('xlsx-populate');
    case 'pdf':
      return import('@react-pdf/renderer');
    case 'charts':
      return import('chart.js');
    case 'mathjs':
      return import('mathjs');
    case 'exceljs':
      return import('exceljs');
    default:
      throw new Error(`Unknown library: ${library}`);
  }
};

export default {
  ExcelEngine,
  ChartComponent,
  PDFGenerator,
  CompanyCamViewer,
  ProductionWorkflow,
  DataTable,
  RichTextEditor,
  SalesforceSync,
  AnalyticsDashboard,
  ProgressiveImage,
  lazyWithRetry,
  loadCalculationWorker,
  preloadComponents,
  loadHeavyLibrary,
};
