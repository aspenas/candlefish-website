import React, { lazy, Suspense } from 'react';

// Loading fallback component with better UX
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Wrap lazy components with error boundary and suspense
export const withLazyLoad = (importFunc: () => Promise<any>) => {
  const LazyComponent = lazy(importFunc);
  
  return (props: any) => (
    <Suspense fallback={<PageLoader />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Lazy loaded routes with prefetch support
export const Dashboard = withLazyLoad(() => 
  import(/* webpackChunkName: "dashboard" */ '../pages/Dashboard')
);

export const Inventory = withLazyLoad(() => 
  import(/* webpackChunkName: "inventory" */ '../pages/Inventory')
);

export const ItemDetail = withLazyLoad(() => 
  import(/* webpackChunkName: "item-detail" */ '../pages/ItemDetail')
);

export const BuyerView = withLazyLoad(() => 
  import(/* webpackChunkName: "buyer-view" */ '../pages/BuyerView')
);

export const Analytics = withLazyLoad(() => 
  import(/* webpackChunkName: "analytics" */ '../pages/Analytics')
);

export const Insights = withLazyLoad(() => 
  import(/* webpackChunkName: "insights" */ '../pages/Insights')
);

export const PhotoCapture = withLazyLoad(() => 
  import(/* webpackChunkName: "photos" */ '../pages/PhotoCapture')
);

export const Collaboration = withLazyLoad(() => 
  import(/* webpackChunkName: "collaboration" */ '../pages/Collaboration')
);

export const Valuations = withLazyLoad(() => 
  import(/* webpackChunkName: "valuations" */ '../pages/Valuations')
);

export const Settings = withLazyLoad(() => 
  import(/* webpackChunkName: "settings" */ '../pages/Settings')
);

// Prefetch critical routes
export const prefetchRoute = (routeName: string) => {
  switch (routeName) {
    case 'dashboard':
      import(/* webpackPrefetch: true */ '../pages/Dashboard');
      break;
    case 'inventory':
      import(/* webpackPrefetch: true */ '../pages/Inventory');
      break;
    case 'analytics':
      import(/* webpackPrefetch: true */ '../pages/Analytics');
      break;
    default:
      break;
  }
};