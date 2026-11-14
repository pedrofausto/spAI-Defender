import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './chrome-extension/manifest.json' with { type: 'json' };

const extensionRoot = fileURLToPath(new URL('./chrome-extension', import.meta.url));

export default defineConfig({
  root: extensionRoot,
  // Static files such as icons are referenced from the manifest, so no public dir is needed.
  publicDir: false,
  plugins: [crx({ manifest })],
  build: {
    outDir: resolve(extensionRoot, '..', 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      // The offscreen document is opened at runtime through chrome.offscreen and is not
      // referenced by the manifest, so it must be listed as an extra entry point.
      input: {
        offscreen: resolve(extensionRoot, 'src/offscreen/offscreen.html')
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 }
  }
});
