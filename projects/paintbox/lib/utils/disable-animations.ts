// Utility to disable animations in production builds
export const isAnimationEnabled = () => {
  // Disable animations during build to reduce memory usage
  if (typeof window === 'undefined') {
    return false;
  }

  // Enable in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Disable in production for now
  return false;
};
