import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import manifest from './manifest.json';

// Plugin to copy content script CSS files
function copyContentCss() {
  return {
    name: 'copy-content-css',
    writeBundle() {
      const srcDir = resolve(__dirname, 'dist/src/content');
      if (!existsSync(srcDir)) {
        mkdirSync(srcDir, { recursive: true });
      }
      copyFileSync(
        resolve(__dirname, 'src/content/fab.css'),
        resolve(__dirname, 'dist/src/content/fab.css')
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    copyContentCss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
    },
  },
});
