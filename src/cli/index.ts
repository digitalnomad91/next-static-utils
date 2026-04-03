import { generateRoutes } from './generateRoutes';

const command = process.argv[2];

switch (command) {
  case 'help':
    console.log(
      'Run next-static-utils generate to generate dynamic fallback routes.\n\nYou can optionally append a config type to output (cloudfront|serve|ghpages) currently supported.\n\nFor GitHub Pages:\n  next-static-utils generate ghpages [/optional-base-path]'
    );
    break;
  case 'generate':
    console.log('Generating Dynamic Fallback Routes...');
    generateRoutes();
    break;
  default:
    console.log(
      'Unknown command, use "help" for a list of available commands.'
    );
    break;
}
