'use client';

import { useEffect, useRef } from 'react';

type ClientScriptLoaderProps = {
  scripts: string[];
};

export function ClientScriptLoader({ scripts }: ClientScriptLoaderProps) {
  const loadedRef = useRef<Set<string>>(new Set());
  const scriptKey = scripts.join(',');

  useEffect(() => {
    let isCancelled = false;

    async function loadScripts() {
      for (const src of scripts) {
        if (isCancelled) break;
        if (loadedRef.current.has(src) || document.querySelector(`script[data-lexino-loader="${src}"]`)) {
          loadedRef.current.add(src);
          continue;
        }

        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = false;
          script.dataset.lexinoLoader = src;
          script.onload = () => {
            loadedRef.current.add(src);
            resolve();
          };
          script.onerror = () => {
            console.warn(`[ClientScriptLoader] Failed to load ${src}. Continuing with next script.`);
            resolve();
          };
          document.body.appendChild(script);
        });
      }
    }

    loadScripts().catch((error) => {
      console.error('[ClientScriptLoader] Error loading scripts:', error);
    });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptKey]);

  return null;
}
