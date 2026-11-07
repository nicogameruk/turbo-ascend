import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths, so the built game works from any folder or host
  // (GitHub Pages, Netlify, itch.io, or just opening a local server).
  base: './',
  build: {
    // three.js alone is ~500 kB; the whole game is one small download.
    chunkSizeWarningLimit: 900,
  },
});
