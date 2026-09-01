import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'node:path'

/**
 * 单文件版构建：整个应用（HTML+JS+CSS）打进一个 HTML 文件，
 * 双击即可在浏览器打开，无需 Node/服务器/联网。
 * file:// 下浏览器 Service Worker 不可用，因此 PWA 插件不参与此构建，
 * 用桩模块替代 virtual:pwa-register。
 */
export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile()],
  resolve: {
    alias: [
      {
        find: 'virtual:pwa-register',
        replacement: resolve(__dirname, 'src/lib/sw-stub.ts')
      }
    ]
  },
  build: {
    outDir: 'dist-single',
    emptyOutDir: true
  }
})
