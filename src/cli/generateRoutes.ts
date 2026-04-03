import { FALLBACK_STRING } from '../utils/constants';
import { getDynamicRoutes } from '../utils/getDynamicRoutes';
import fs from 'fs';
import path from 'path';

export const generateRoutes = () => {
  const routes = getDynamicRoutes();
  printRoutes(routes);
  writeRoutes(routes);

  const serverType = process.argv[3];
  generateServerConfig(serverType, routes);
};

const printRoutes = (routes: string[]) => {
  console.log(routes.length, 'dynamic routes detected:');
  for (let route of routes) {
    console.log(route);
  }
};

const writeRoutes = (routes: string[]) => {
  const routesFile = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicRoutes = void 0;
exports.dynamicRoutes = ${JSON.stringify(routes, null, 2)};`;

  const pathToUpdate = `${process.cwd()}/node_modules/next-static-utils/dist/utils/dynamicRoutes.js`;

  fs.writeFileSync(pathToUpdate, routesFile);
};

const writeServeJson = (routes: string[]) => {
  const serveJson = {
    rewrites: routes.map(routeToRewrite),
  };

  const pathToUpdate = `${process.cwd()}/serve.json`;
  fs.writeFileSync(pathToUpdate, JSON.stringify(serveJson, null, 2));
};

const routeToRewrite = (route: string) => {
  return {
    source: route.replace(/\[([^\]]+)\]/g, ':$1'), // change to /user/:id format
    destination: route.replace(/\[([^\]]+)\]/g, FALLBACK_STRING) + '.html', // change to /user/fallback format
  };
};

const generateServerConfig = (serverType: string, routes: string[]) => {
  switch (serverType) {
    case 'serve':
      writeServeJson(routes);
      break;
    case 'cloudfront':
      writeCloudfrontConfig(routes);
      break;
    case 'ghpages':
      writeGithubPagesConfig(routes);
      break;
    default:
      break;
  }
};

const writeCloudfrontConfig = (routes: string[]) => {
  const rewrites = routes.map(routeToRewrite);

  const cloudFuncStr = fs.readFileSync(
    `${process.cwd()}/node_modules/next-static-utils/dist/cli/referenceCloudfrontFunc.js`,
    'utf8'
  );
  const cloudFunc = cloudFuncStr
    .replace('[]', JSON.stringify(rewrites, null, 4))
    .replace('"use strict";', '');

  const pathToUpdate = `${process.cwd()}/cloudfrontFunc.js`;

  fs.writeFileSync(pathToUpdate, cloudFunc);
};

const writeGithubPagesConfig = (routes: string[]) => {
  const rewrites = routes.map(routeToRewrite);
  const basePath = process.argv[4] || '';

  const html404 = getGithubPages404Template(rewrites, basePath);

  const outDir = path.join(process.cwd(), 'out');

  // Write to out/ if it exists, otherwise to project root
  const targetDir = fs.existsSync(outDir) ? outDir : process.cwd();

  fs.writeFileSync(path.join(targetDir, '404.html'), html404);
  fs.writeFileSync(path.join(targetDir, '.nojekyll'), '');

  console.log(`GitHub Pages files written to ${targetDir}/`);
  console.log('  - 404.html (handles dynamic route redirects)');
  console.log('  - .nojekyll (prevents Jekyll processing)');

  if (targetDir === process.cwd()) {
    console.log(
      '\nNote: "out/" directory not found. Files written to project root.'
    );
    console.log(
      'Run this command after "next build" to write directly to the output directory.'
    );
  }

  if (basePath) {
    console.log(`\nBase path configured: ${basePath}`);
  }
};

const getGithubPages404Template = (
  rewrites: { source: string; destination: string }[],
  basePath: string
): string => {
  const rewritesJson = JSON.stringify(rewrites, null, 4);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Page Not Found</title>
  <script>
    (function() {
      var defined_rewrites = ${rewritesJson};
      var basePath = '${basePath}';

      function isMatch(pattern, path) {
        var regexStr = pattern.replace(/:([^/]+)/g, '([^/]+)');
        return new RegExp('^' + regexStr + '$').test(path);
      }

      var fullPath = window.location.pathname;
      var pathname = fullPath;

      // Strip basePath prefix if present
      if (basePath && pathname.indexOf(basePath) === 0) {
        pathname = pathname.slice(basePath.length) || '/';
      }

      // Remove trailing slash for matching (except root)
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }

      for (var i = 0; i < defined_rewrites.length; i++) {
        var rewrite = defined_rewrites[i];
        if (isMatch(rewrite.source, pathname)) {
          // Store paths for the app to restore the original URL and extract params
          sessionStorage.setItem(
            'next-static-redirect-url',
            fullPath + window.location.search + window.location.hash
          );
          sessionStorage.setItem('next-static-redirect-path', pathname);

          // Redirect to the fallback page
          var destination = basePath + rewrite.destination.replace(/\\.html$/, '');
          window.location.replace(destination);
          return;
        }
      }
    })();
  </script>
</head>
<body>
  <h1>404 - Page Not Found</h1>
  <p>The page you are looking for does not exist.</p>
</body>
</html>`;
};
