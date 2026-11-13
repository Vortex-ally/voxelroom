import { defineConfig, type Plugin } from 'vite';
import { rendererAliases } from './vite.aliases.mts';

/**
 * Production Content Security Policy: the page may only load its own bundled
 * scripts, styles, images and fonts. No inline scripts, eval, remote code,
 * plugins, frames or form submissions.
 */
const productionCsp: Record<string, string[]> = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
};

/**
 * Development needs exactly two additions, and only while the dev server runs:
 *  - 'unsafe-inline' styles, because Vite injects CSS as <style> tags for hot reload;
 *  - a WebSocket to the dev server's own address, for hot module replacement.
 */
function developmentCsp(devServerUrl: string): Record<string, string[]> {
  const wsOrigin = new URL(devServerUrl).origin.replace(/^http/, 'ws');
  return {
    ...productionCsp,
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': ["'self'", wsOrigin],
  };
}

const serialize = (policy: Record<string, string[]>) =>
  Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');

/** Inserts the CSP <meta> tag as the first element in <head>, before any script. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'voxelroom:csp',
    transformIndexHtml(_html, ctx) {
      const devUrl = ctx.server?.resolvedUrls?.local[0];
      const policy = devUrl ? developmentCsp(devUrl) : productionCsp;
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: serialize(policy),
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// https://vitejs.dev/config
export default defineConfig({
  plugins: [contentSecurityPolicy()],
  resolve: { alias: rendererAliases },
});
