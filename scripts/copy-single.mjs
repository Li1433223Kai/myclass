import { copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'dist-single', 'index.html')

copyFileSync(src, join(root, '我的课表.html'))
try {
  const desktop = join(process.env.USERPROFILE || root, 'Desktop')
  copyFileSync(src, join(desktop, '我的课表.html'))
  console.log('已生成: 桌面\\我的课表.html 和项目根目录 我的课表.html（双击即可打开）')
} catch {
  console.log('已生成: 我的课表.html（复制到桌面失败，可手动复制）')
}
