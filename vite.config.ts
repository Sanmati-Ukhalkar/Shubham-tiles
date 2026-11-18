import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  // Pre-bundle the three.js helpers used by the lazily loaded 3D screens, so the dev
  // server never has to re-optimise (and reload) when someone first opens a 3D view.
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/environments/RoomEnvironment.js',
      'three/examples/jsm/geometries/RoundedBoxGeometry.js',
      'jspdf',
    ],
  },
});
