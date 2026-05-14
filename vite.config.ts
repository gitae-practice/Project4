import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/kakao-api': {
        target: 'https://dapi.kakao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kakao-api/, ''),
      },
      '/kakao-navi': {
        target: 'https://apis-navi.kakaomobility.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kakao-navi/, ''),
      },
    },
  },
})
