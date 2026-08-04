import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署在 /EdgingGame/ 子路径下，需要设置 base
  // 本地开发时 vite 会自动忽略，不影响 localhost 访问
  base: '/EdgingGame/',
  server: {
    port: 3000,
    open: true,
  },
})
