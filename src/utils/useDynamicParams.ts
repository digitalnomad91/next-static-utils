import { usePathname } from 'next/navigation';

import { dynamicRoutes } from './dynamicRoutes';
import { extractParamsFromPath } from './extractParamsFromPath';
import { useEffect, useState } from 'react';

const REDIRECT_PATH_KEY = 'next-static-redirect-path';
const REDIRECT_URL_KEY = 'next-static-redirect-url';

export const useDynamicParams = (): Record<string, string> => {
  const [params, setParams] = useState<Record<string, string>>({});
  const pathName = usePathname();

  useEffect(() => {
    if (!dynamicRoutes)
      throw new Error(
        'No dynamic routes found, you likely need to run next-static-utils generate'
      );

    let effectivePath = pathName;

    // Check for a redirect from GitHub Pages 404.html
    try {
      const redirectPath = sessionStorage.getItem(REDIRECT_PATH_KEY);
      const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);

      if (redirectPath) {
        sessionStorage.removeItem(REDIRECT_PATH_KEY);
        sessionStorage.removeItem(REDIRECT_URL_KEY);
        effectivePath = redirectPath;

        // Restore the original URL in the browser address bar
        // Validate that the URL is a safe same-origin relative path
        if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
          window.history.replaceState(null, '', redirectUrl);
        }
      }
    } catch {
      // sessionStorage may not be available in some environments
    }

    const nextParams = extractParamsFromPath(effectivePath, dynamicRoutes) || {};
    setParams(nextParams);
  }, [pathName]);

  return params;
};
