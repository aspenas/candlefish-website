// Dynamic component imports for memory optimization
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Large production components - dynamically loaded
export const SecurityScanner = dynamic(
  () => import('@/components/production/SecurityScanner'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false // Client-side only for heavy components
  }
);

export const MonitoringDashboard = dynamic(
  () => import('@/components/production/MonitoringDashboard'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const CircuitBreakerPanel = dynamic(
  () => import('@/components/production/CircuitBreakerPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const APIKeyManager = dynamic(
  () => import('@/components/production/APIKeyManager'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Large UI components
export const CompanyCamProjectManager = dynamic(
  () => import('@/components/ui/CompanyCamProjectManager'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const PDFViewer = dynamic(
  () => import('@/components/ui/PDFViewer'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const PDFEstimateGenerator = dynamic(
  () => import('@/components/ui/PDFEstimateGenerator'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Large workflow components
export const ClientInfoFormEnhanced = dynamic(
  () => import('@/components/workflow/ClientInfoFormEnhanced'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const ReviewCalculations = dynamic(
  () => import('@/components/workflow/ReviewCalculations'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Security components
export const SecurityConfigurationPanel = dynamic(
  () => import('@/components/secrets/SecurityConfigurationPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);