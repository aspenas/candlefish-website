import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component that handles hash-based navigation redirects
 * Converts hash routes (#inventory) to path routes (/inventory)
 */
export default function HashRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only process hash redirects if we're on the root path or have a hash
    // This prevents interference with normal routing
    if (window.location.hash && (window.location.pathname === '/' || window.location.pathname === '')) {
      const hash = window.location.hash.substring(1).toLowerCase().trim();

      // Map hash routes to path routes
      const hashToPath: Record<string, string> = {
        'inventory': '/inventory',
        'photos': '/photos',
        'analytics': '/analytics',
        'aiinsights': '/insights',
        'insights': '/insights',
        'settings': '/settings',
        'collaboration': '/collaboration',
        'buyer-view': '/buyer-view',
      };

      const targetPath = hashToPath[hash];

      if (targetPath) {
        console.log(`[HashRedirect] Redirecting from #${hash} to ${targetPath}`);

        // Use setTimeout to ensure React Router is fully initialized
        setTimeout(() => {
          navigate(targetPath, { replace: true });

          // Clear the hash from the URL after navigation
          setTimeout(() => {
            if (window.location.hash) {
              window.history.replaceState(null, '', targetPath);
            }
          }, 100);
        }, 0);
      }
    }
  }, [navigate]);

  // Handle hash changes during the session (less aggressive)
  useEffect(() => {
    const handleHashChange = () => {
      // Only handle hash changes if we're on root path
      if (window.location.hash && (window.location.pathname === '/' || window.location.pathname === '')) {
        const hash = window.location.hash.substring(1).toLowerCase().trim();

        const hashToPath: Record<string, string> = {
          'inventory': '/inventory',
          'photos': '/photos',
          'analytics': '/analytics',
          'aiinsights': '/insights',
          'insights': '/insights',
          'settings': '/settings',
          'collaboration': '/collaboration',
          'buyer-view': '/buyer-view',
        };

        const targetPath = hashToPath[hash];

        if (targetPath) {
          console.log(`[HashRedirect] Hash changed, redirecting to ${targetPath}`);
          navigate(targetPath, { replace: true });

          // Clear hash after a short delay
          setTimeout(() => {
            if (window.location.hash) {
              window.history.replaceState(null, '', targetPath);
            }
          }, 100);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [navigate]);

  return null;
}
