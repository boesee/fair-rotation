import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages liefert dieses Repo unter /fair-rotation/ aus (Projekt-Site,
  // kein <user>.github.io-Root-Repo).
  base: '/fair-rotation/',
})
