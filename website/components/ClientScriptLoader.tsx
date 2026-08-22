'use client';

import { useEffect } from 'react';

type ClientScriptLoaderProps = {
  scripts: string[];
};

export function ClientScriptLoader({ scripts }: ClientScriptLoaderProps) {
  useEffect(() => {
    async function loadScripts() {
      for (const src of scripts) {
        if (document.querySelector(`script[data-lexino-loader="${src}"]`)) {
          continue;
        }

        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = false;
          script.dataset.lexinoLoader = src;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.body.appendChild(script);
        });
      }
    }

    loadScripts().catch((error) => {
      console.error(error);
    });

    return undefined;
  }, [scripts]);

  return null;
}
