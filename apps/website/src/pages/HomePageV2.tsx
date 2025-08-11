import React, { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Eager load critical above-the-fold component
import HeroSectionV2 from '../components/sections/v2/HeroSectionV2Optimized';

// Lazy load below-the-fold components
const ValuePropositionV2 = lazy(() =>
  import(/* webpackChunkName: "value-proposition-v2" */ '../components/sections/v2/ValuePropositionV2')
);

const WhatWeDoV2 = lazy(() =>
  import(/* webpackChunkName: "what-we-do-v2" */ '../components/sections/v2/WhatWeDoV2')
);

const HowItWorksV2 = lazy(() =>
  import(/* webpackChunkName: "how-it-works-v2" */ '../components/sections/v2/HowItWorksV2')
);

const PilotProjectsV2 = lazy(() =>
  import(/* webpackChunkName: "pilot-projects-v2" */ '../components/sections/v2/PilotProjectsV2')
);

const CTASectionV2 = lazy(() =>
  import(/* webpackChunkName: "cta-section-v2" */ '../components/sections/v2/CTASectionV2')
);

const FooterV2 = lazy(() =>
  import(/* webpackChunkName: "footer-v2" */ '../components/v2/FooterV2')
);

// Loading placeholder component
const SectionLoader: React.FC<{ height?: string }> = ({ height = '400px' }) => (
  <div
    style={{
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }}
  >
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

// Error fallback component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
  </div>
);

// Progressive section component for gradual rendering
const ProgressiveSection: React.FC<{
  children: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
  fallbackHeight?: string;
}> = ({ children, priority = 'medium', fallbackHeight = '400px' }) => {
  const [shouldRender, setShouldRender] = React.useState(priority === 'high');

  React.useEffect(() => {
    if (priority === 'high') return;

    const timeouts: { [key: string]: number } = {
      medium: 100,
      low: 500
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setShouldRender(true), {
        timeout: timeouts[priority]
      });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setShouldRender(true), timeouts[priority]);
      return () => clearTimeout(timer);
    }
  }, [priority]);

  if (!shouldRender) {
    return <SectionLoader height={fallbackHeight} />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<SectionLoader height={fallbackHeight} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

const HomePageV2: React.FC = () => {
  // Prefetch components on idle
  React.useEffect(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Prefetch below-the-fold components
        import('../components/sections/v2/ValuePropositionV2');
        import('../components/sections/v2/WhatWeDoV2');
      });
    }
  }, []);

  return (
    <div className="homepage-v2">
      {/* Critical above-the-fold content - loaded immediately */}
      <HeroSectionV2 />

      {/* Progressive loading for below-the-fold sections */}
      <ProgressiveSection priority="high" fallbackHeight="500px">
        <ValuePropositionV2 />
      </ProgressiveSection>

      <ProgressiveSection priority="medium" fallbackHeight="600px">
        <WhatWeDoV2 />
      </ProgressiveSection>

      <ProgressiveSection priority="medium" fallbackHeight="500px">
        <HowItWorksV2 />
      </ProgressiveSection>

      <ProgressiveSection priority="low" fallbackHeight="700px">
        <PilotProjectsV2 />
      </ProgressiveSection>

      <ProgressiveSection priority="low" fallbackHeight="400px">
        <CTASectionV2 />
      </ProgressiveSection>

      <ProgressiveSection priority="low" fallbackHeight="300px">
        <FooterV2 />
      </ProgressiveSection>
    </div>
  );
};

export default HomePageV2;
