/**
 * 媒体素材配置
 * ========================================
 * 定义本地媒体素材清单与随机抽取逻辑。
 * 支持内置素材（public/media/）+ 用户上传素材（IndexedDB）。
 * 媒体来源由设置 mediaSource 控制：
 *   - 'custom'  : 仅使用用户上传的素材
 *   - 'mixed'   : 内置 + 用户上传混合
 *   - 'builtin' : 仅使用内置素材
 */

import type { MediaItem } from '../types'
import { mediaDB, climaxMediaDB } from '../utils/mediaDB'
import { getSettings } from '../store/useSettingsStore'
import { BUILT_IN_MEDIA } from './builtinMediaManifest'

/** 用户上传的媒体列表（独立维护，不混入内置列表） */
const CUSTOM_MEDIA: MediaItem[] = []

/** 用户自定义媒体 id → blob URL 映射，用于删除时 revoke */
const customMediaMap = new Map<number, string>()

/** 通关高潮专属素材列表（独立于常规素材池） */
const CLIMAX_MEDIA: MediaItem[] = []

/** 高潮素材 id → blob URL 映射 */
const climaxMediaMap = new Map<number, string>()

/** 上一次播放的媒体 src，避免连续重复 */
let lastSrc = ''

/** 上一次使用的媒体池快照，用于检测池变化时重置 lastSrc */
let lastPoolSnapshot = ''

// ---- 日志 ----
const MLOG = '[mediaConfig]'
const mlog = (...a: unknown[]) => console.log(MLOG, ...a)
const mwarn = (...a: unknown[]) => console.warn(MLOG, ...a)

// ========================================
//  媒体池：根据设置动态生成
// ========================================

/**
 * 根据当前设置的 mediaSource 获取可用媒体池
 */
export function getActiveMediaPool(): MediaItem[] {
  const source = getSettings().mediaSource
  switch (source) {
    case 'custom':
      return CUSTOM_MEDIA
    case 'builtin':
      return BUILT_IN_MEDIA
    case 'mixed':
    default:
      return [...BUILT_IN_MEDIA, ...CUSTOM_MEDIA]
  }
}

/** 兼容旧代码：MEDIA_LIBRARY 现在是动态计算 */
export const MEDIA_LIBRARY: MediaItem[] = []  // 不再直接使用，保留导出以防其他地方引用

// ========================================
//  预加载
// ========================================

/** 静默预加载一张媒体到浏览器缓存 */
function preloadToBrowserCache(item: MediaItem): void {
  if (item.type === 'image') {
    const img = new Image()
    img.src = item.src
  } else {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.src = item.src
  }
}

/** 预热媒体缓存：从库中随机抽取若干张静默预加载 */
export function warmMediaCache(count: number = 3): void {
  const pool = getActiveMediaPool()
  const total = pool.length
  if (total === 0) return
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * total)
    preloadToBrowserCache(pool[idx])
  }
}

// ========================================
//  IndexedDB 初始化与管理
// ========================================

/** 启动时从 IndexedDB 恢复用户上传的媒体 */
export async function initCustomMedia(): Promise<void> {
  mlog('initCustomMedia start')
  try {
    const records = await mediaDB.getAll()
    mlog('found', records.length, 'custom records')
    for (const r of records) {
      try {
        if (r.id === undefined || !r.blob) continue
        const url = URL.createObjectURL(r.blob)
        customMediaMap.set(r.id, url)
        CUSTOM_MEDIA.push({ src: url, type: r.type })
        mlog('restored:', r.name, '→', url.slice(0, 40))
      } catch (e) {
        mwarn('skip bad record:', r.name, e)
      }
    }
    mlog('custom:', CUSTOM_MEDIA.length, 'builtin:', BUILT_IN_MEDIA.length)
  } catch (e) {
    mwarn('initCustomMedia failed:', e)
  }
}

/** 添加一个自定义媒体到库中（自动去重） */
export function addCustomMedia(id: number, url: string, type: 'image' | 'video'): void {
  customMediaMap.set(id, url)
  // 避免重复添加相同 src
  if (!CUSTOM_MEDIA.some((m) => m.src === url)) {
    CUSTOM_MEDIA.push({ src: url, type })
  }
}

/** 从库中移除指定自定义媒体 */
export function removeCustomMedia(id: number): void {
  const url = customMediaMap.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    customMediaMap.delete(id)
    const idx = CUSTOM_MEDIA.findIndex((m) => m.src === url)
    if (idx !== -1) CUSTOM_MEDIA.splice(idx, 1)
  
  }
}

/** 获取用户上传媒体数量（供设置页显示） */
export function getCustomMediaCount(): number {
  return CUSTOM_MEDIA.length
}

/** 获取内置媒体数量（供设置页显示） */
export function getBuiltinMediaCount(): number {
  return BUILT_IN_MEDIA.length
}

// ========================================
//  通关高潮专属素材池
// ========================================

/** 启动时从 IndexedDB 恢复用户上传的高潮素材 */
export async function initClimaxMedia(): Promise<void> {
  mlog('initClimaxMedia start')
  try {
    const records = await climaxMediaDB.getAll()
    mlog('found', records.length, 'climax records')
    for (const r of records) {
      try {
        if (r.id === undefined || !r.blob) continue
        const url = URL.createObjectURL(r.blob)
        climaxMediaMap.set(r.id, url)
        CLIMAX_MEDIA.push({ src: url, type: r.type })
        mlog('restored climax:', r.name, '→', url.slice(0, 40))
      } catch (e) {
        mwarn('skip bad climax record:', r.name, e)
      }
    }
    mlog('climax media:', CLIMAX_MEDIA.length)
  } catch (e) {
    mwarn('initClimaxMedia failed:', e)
  }
}

/** 添加一个高潮素材到库中（自动去重） */
export function addClimaxMedia(id: number, url: string, type: 'image' | 'video'): void {
  climaxMediaMap.set(id, url)
  if (!CLIMAX_MEDIA.some((m) => m.src === url)) {
    CLIMAX_MEDIA.push({ src: url, type })
  }
}

/** 从高潮库中移除指定素材 */
export function removeClimaxMedia(id: number): void {
  const url = climaxMediaMap.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    climaxMediaMap.delete(id)
    const idx = CLIMAX_MEDIA.findIndex((m) => m.src === url)
    if (idx !== -1) CLIMAX_MEDIA.splice(idx, 1)
  }
}

/** 获取高潮素材数量（供设置页显示） */
export function getClimaxMediaCount(): number {
  return CLIMAX_MEDIA.length
}

/**
 * 随机抽取一个高潮素材
 * @returns 高潮素材，库为空时返回 null
 */
export function drawClimaxMedia(): MediaItem | null {
  if (CLIMAX_MEDIA.length === 0) return null
  if (CLIMAX_MEDIA.length === 1) return CLIMAX_MEDIA[0]
  return CLIMAX_MEDIA[Math.floor(Math.random() * CLIMAX_MEDIA.length)]
}

// ========================================
//  随机抽取（常规素材池）
// ========================================

/**
 * 随机抽取一个媒体素材（不连续重复）
 */
export function drawRandomMedia(): MediaItem {
  const pool = getActiveMediaPool()
  const poolKey = pool.map(m => m.src).join('|')

  // 池变化时重置去重记录
  if (poolKey !== lastPoolSnapshot) {
    lastSrc = ''
    lastPoolSnapshot = poolKey
  }

  mlog('drawRandomMedia, pool size:', pool.length, 'source:', getSettings().mediaSource)

  if (pool.length === 0) {
    throw new Error('[mediaConfig] 媒体库为空，请前往「设置」上传自定义素材（图片/视频）')
  }
  if (pool.length === 1) {
    lastSrc = pool[0].src
    return pool[0]
  }

  // 随机抽取，避免与上一次相同
  let item: MediaItem
  do {
    item = pool[Math.floor(Math.random() * pool.length)]
  } while (item.src === lastSrc)

  lastSrc = item.src
  return item
}
