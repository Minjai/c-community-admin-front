import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@layouts': '/src/layouts',
      '@pages': '/src/pages',
      '@hooks': '/src/hooks',
      '@store': '/src/store',
      '@api': '/src/api',
      '@utils': '/src/utils',
      '@types': '/src/types',
      '@assets': '/src/assets',
    },
  },
})
