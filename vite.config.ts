import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({ plugins: [react(), tailwindcss()], build: { sourcemap: false, rollupOptions:{output:{manualChunks:{supabase:['@supabase/supabase-js'],react:['react','react-dom','react-router-dom']}}} } })
