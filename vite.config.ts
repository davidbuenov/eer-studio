import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages requires assets served from /<repo-name>/ base path.
// We set base explicitly; override via VITE_BASE env if needed.
const base = process.env.VITE_BASE || '/eer-studio/';

export default defineConfig({
  base,
  plugins: [react()],
})
