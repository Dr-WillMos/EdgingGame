/**
 * 自动扫描 public/media/ 目录，生成内置素材清单。
 * 在 npm run dev / build 前自动执行。
 */

import { readdirSync, statSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'

const CWD = process.cwd()
const MEDIA_DIR = resolve(CWD, 'public', 'media')
const OUT_FILE = resolve(CWD, 'src', 'config', 'builtinMediaManifest.ts')

/** 支持的媒体扩展名 */
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.ogg']

function detectType(name) {
  const lower = name.toLowerCase()
  if (IMAGE_EXTS.some((ext) => lower.endsWith(ext))) return 'image'
  if (VIDEO_EXTS.some((ext) => lower.endsWith(ext))) return 'video'
  return null
}

function scanMedia() {
  const items = []
  try {
    const files = readdirSync(MEDIA_DIR)
    for (const file of files) {
      const fullPath = join(MEDIA_DIR, file)
      const stat = statSync(fullPath)
      if (!stat.isFile()) continue
      const type = detectType(file)
      if (!type) continue
      // public/media/ 下的文件访问路径是 /media/文件名
      items.push({ src: `/media/${file}`, type })
    }
  } catch (e) {
    console.warn('[generate-media-manifest] public/media/ 不存在或无法读取:', e.message)
  }
  return items
}

function generate() {
  const items = scanMedia()
  const lines = items.map((item) => `  { src: '${item.src}', type: '${item.type}' as const },`)

  const content = `/**
 * 内置媒体素材清单（自动生成）
 * ========================================
 * 由 scripts/generate-media-manifest.js 根据 public/media/ 目录内容生成。
 * 不要手动修改此文件，运行 npm run dev/build 时会自动重新生成。
 */

import type { MediaItem } from '../types'

export const BUILT_IN_MEDIA: MediaItem[] = [
${lines.join('\n')}
]
`

  writeFileSync(OUT_FILE, content, 'utf-8')
  console.log(`[generate-media-manifest] 已生成 ${items.length} 个内置素材`)
}

generate()
