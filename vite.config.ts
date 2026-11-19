import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {defineConfig, type Plugin} from 'vite';

/** Menyuntikkan daftar berkas build ke public/sw.js (precache) dan memberi versi cache berdasarkan isinya. */
function pwaPrecache(): Plugin {
  let outDir = 'dist';
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return {
    name: 'pwa-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
        .sort();
      const list = ['./', ...files];
      const hash = createHash('sha256')
        .update(files.map((f) => f + ':' + readFileSync(join(outDir, f)).length).join('|'))
        .digest('hex')
        .slice(0, 10);
      const swPath = join(outDir, 'sw.js');
      const src = readFileSync(swPath, 'utf8')
        .replace('/*PRECACHE*/ []', JSON.stringify(list))
        .replace("/*VERSION*/ 'dev'", JSON.stringify(hash));
      writeFileSync(swPath, src);
    },
  };
}

export default defineConfig(() => {
  const previewPort = Number(process.env.PORT) || 4173;

  return {
    base: './',
    plugins: [react(), tailwindcss(), pwaPrecache()],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/leaflet')) return 'vendor-leaflet';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          },
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: previewPort,
      strictPort: true,
    },
  };
});
