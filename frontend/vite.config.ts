import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getAppVersion(): string {
  // 1) Try git tag
  try {
    return execSync('git describe --tags --abbrev=0', { cwd: resolve(__dirname, '..') }).toString().trim();
  } catch {
    // not a git repo or no tags
  }

  // 2) Fallback: read first version from CHANGELOG.md
  try {
    const changelog = readFileSync(resolve(__dirname, '..', 'CHANGELOG.md'), 'utf-8');
    const match = changelog.match(/^## \[v?(\d+\.\d+\.\d+)\]/m);
    if (match) return 'v' + match[1];
  } catch {
    // CHANGELOG not found
  }

  // 3) Ultimate fallback
  return 'dev';
}

const appVersion = getAppVersion();

function versionJsonPlugin(): Plugin {
  return {
    name: 'write-version-json',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        resolve(outDir, 'version.json'),
        JSON.stringify({ version: appVersion }, null, 2),
        'utf-8',
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      navigateFallback: '/index.html',
      manifest: {
        name: 'Fiz! App',
        short_name: 'Fiz!',
        description: 'Sistema de Lista de Chamada',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        id: '/',
        icons: [
          {
            src: 'icons/iconFiz!.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/iconFiz!.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icondarkFiz!.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icondarkFiz!.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
    versionJsonPlugin(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
