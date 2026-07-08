import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites under /<repo-name>/, not the domain root — only apply
  // that base path for the dedicated gh-pages build so local dev and Vercel (root-served)
  // stay unaffected.
  base: process.env.DEPLOY_TARGET === 'gh-pages' ? '/mypath-prototype/' : '/',
  plugins: [react()],
})
