
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import path from 'node:path';
  import { fileURLToPath } from 'node:url';

  const srcDir = fileURLToPath(new URL('./src', import.meta.url));
  const assetDir = fileURLToPath(new URL('./src/assets', import.meta.url));

function figmaAssetResolver(): import('vite').Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(assetDir, filename)
      }
    },
  }
}

  export default defineConfig({
    plugins: [react(), figmaAssetResolver()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': srcDir,
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  });