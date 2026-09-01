import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

/** 部署到 GitHub Pages 时设置 PAGES_BASE=/<仓库名>/，本地默认 / */
const base = process.env.PAGES_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '我的课表',
        short_name: '课表',
        description: '课表快速查询：今日课程、整周课表、周次与单双周',
        theme_color: '#4f6ef7',
        background_color: '#f6f7fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html'
      }
    })
  ]
})
