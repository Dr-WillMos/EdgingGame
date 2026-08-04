import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 绑定自定义域名后，GitHub Pages 服务在根路径 /
  // 本地开发时 vite 会自动忽略 base，不影响 localhost 访问
  base: '/',
  server: {
    port: 3000,
    open: true,
  },
})
