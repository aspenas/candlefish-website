import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component that handles hash-based navigation redirects
 * Converts hash routes (#inventory) to path routes (/inventory)
 */
export default function HashRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a hash in the URL
    if (window.location.hash) {
      const hash = window.location.hash.substring(1); // Remove the #

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

      const targetPath = hashToPath[hash.toLowerCase()];

      if (targetPath) {
        // Navigate to the corresponding path
        navigate(targetPath, { replace: true });

        // Clear the hash from the URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [navigate]);

  // Also listen for hash changes during the session
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const hash = window.location.hash.substring(1);

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

        const targetPath = hashToPath[hash.toLowerCase()];

        if (targetPath) {
          navigate(targetPath, { replace: true });
          window.history.replaceState(null, '', window.location.pathname);
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
