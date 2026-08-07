import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  // relative base so the single-file build works at any path (e.g. colecarter.io/pathways/)
  base: './',
  plugins: [react(), viteSingleFile()],
})
