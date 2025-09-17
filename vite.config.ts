import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Base path for GitHub Pages. Adjust if repo name changes.
  // If deploying to https://<user>.github.io/ (special repo) set this to '/' instead.
  base: '/shadow-phase-runner/',
  plugins: [react()],
})
