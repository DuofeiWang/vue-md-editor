import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'markdown-vendor': ['markdown-it', 'highlight.js'],
          'editor-vendor': ['@codemirror/state', '@codemirror/view', '@codemirror/lang-markdown', '@codemirror/commands'],
          'utils-vendor': ['turndown']
        }
      }
    }
  }
})
