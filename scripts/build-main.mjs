import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('dist-electron', { recursive: true, force: true });

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: ['electron', 'electron-updater'],
  logLevel: 'info'
};

await build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.js' });
await build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.js' });
