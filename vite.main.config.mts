import { defineConfig } from 'vite';
import { sharedAliases } from './vite.aliases.mts';

// https://vitejs.dev/config
export default defineConfig({
  resolve: { alias: sharedAliases },
});
