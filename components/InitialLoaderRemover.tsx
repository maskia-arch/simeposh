'use client';

import { useEffect } from 'react';

export function InitialLoaderRemover() {
  useEffect(() => {
    const removeLoader = () => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
          loader.remove();
        }, 500); // matches the CSS transition opacity duration
      }
    };

    // Ensure all styles, scripts, and fonts are completely loaded (document.readyState === 'complete')
    if (document.readyState === 'complete') {
      // Small timeout to allow hydration rendering and font settling
      const t = setTimeout(removeLoader, 100);
      return () => clearTimeout(t);
    } else {
      window.addEventListener('load', removeLoader);
      return () => window.removeEventListener('load', removeLoader);
    }
  }, []);

  return null;
}
