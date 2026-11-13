import { fileURLToPath } from 'node:url';

const src = (dir: string) =>
  fileURLToPath(new URL(`./src/${dir}`, import.meta.url));

/** Aliases usable from every process (pure TypeScript, no Node or DOM). */
export const sharedAliases = {
  '@shared': src('shared'),
};

/** Aliases for the renderer layers. Keep in sync with `paths` in tsconfig.json. */
export const rendererAliases = {
  ...sharedAliases,
  '@app': src('renderer/app'),
  '@core': src('renderer/core'),
  '@engine': src('renderer/engine'),
  '@geometry': src('renderer/geometry'),
  '@features': src('renderer/features'),
  '@state': src('renderer/state'),
  '@ui': src('renderer/ui'),
  '@styles': src('renderer/styles'),
};
