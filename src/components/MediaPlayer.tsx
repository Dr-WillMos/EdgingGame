/**
 * 媒体播放器组件
 * ================================
 * 双层无缝交叉淡入。
 * 视频播放完毕（onEnded）自动切换到下一个随机视频。
 * 图片保留 5s 固定间隔切换（兼容备用）。
 * A/B 两个层永远存在，用 showA 控制可见层。
 */

import { useEffect, useState, useRef } from 'react'
import type { MediaItem } from '../types'
import { getActiveMediaPool, drawRandomMedia } from '../config/mediaConfig'
import { useSettingsStore } from '../store/useSettingsStore'

/** 图片展示固定时长（毫秒），仅图片类型使用 */
const IMAGE_DISPLAY_MS = 5000

interface MediaPlayerProps {
  media: MediaItem | null
  onEnded?: () => void
  fullscreen?: boolean
}

// 日志工具（开发环境启用，生产环境静默）
const LOG_TAG = '[MediaPlayer]'
const __DEV__ = import.meta.env.DEV
const log = (...args: unknown[]) => { if (__DEV__) console.log(LOG_TAG, ...args) }
const warn = (...args: unknown[]) => { if (__DEV__) console.warn(LOG_TAG, ...args) }

export default function MediaPlayer({
  media,
  fullscreen = false,
}: MediaPlayerProps) {
  // 音效开关：关闭时视频也静音
  const soundEnabled = useSettingsStore((s) => s.settings.soundEnabled)

  // 两层内容
  const [itemA, setItemA] = useState<MediaItem | null>(null)
  const [itemB, setItemB] = useState<MediaItem | null>(null)
  const [showA, setShowA] = useState(true)

  // loading 状态
  const [loadedA, setLoadedA] = useState(false)
  const [loadedB, setLoadedB] = useState(false)
  const [errA, setErrA] = useState(false)
  const [errB, setErrB] = useState(false)

  // refs
  const switchingRef = useRef(false)
  const nextRef = useRef<MediaItem | null>(null)
  const nextReadyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 追踪当前可见层的最新状态（供 setTimeout 闭包读取）
  const showARef = useRef(true)
  const itemARef = useRef<MediaItem | null>(null)
  const itemBRef = useRef<MediaItem | null>(null)
  const loadedARef = useRef(false)
  const loadedBRef = useRef(false)
  // 视频元素引用，用于暂停/播放控制
  const videoARef = useRef<HTMLVideoElement | null>(null)
  const videoBRef = useRef<HTMLVideoElement | null>(null)

  // ---- 同步 ref：仅在状态变化时更新 ----
  useEffect(() => {
    showARef.current = showA
  }, [showA])
  useEffect(() => {
    itemARef.current = itemA
  }, [itemA])
  useEffect(() => {
    itemBRef.current = itemB
  }, [itemB])
  useEffect(() => {
    loadedARef.current = loadedA
  }, [loadedA])
  useEffect(() => {
    loadedBRef.current = loadedB
  }, [loadedB])

  log('render, media=\'' + (media?.src?.slice(0, 60) ?? 'null') + '\'')

  // ---- 视频暂停/播放控制：隐藏层暂停，可见层从头播放 ----
  useEffect(() => {
    const va = videoARef.current
    const vb = videoBRef.current
    if (showA) {
      if (vb && !vb.paused) { vb.pause(); log('paused B video') }
      if (va && va.readyState >= 2) { va.currentTime = 0; va.play().catch(() => {}) }
    } else {
      if (va && !va.paused) { va.pause(); log('paused A video') }
      if (vb && vb.readyState >= 2) { vb.currentTime = 0; vb.play().catch(() => {}) }
    }
  }, [showA])

  // 预加载：跟踪正在进行的预加载元素以便清理
  const preloadRef = useRef<{ img?: HTMLImageElement; video?: HTMLVideoElement }>({})

  const preload = (item: MediaItem): Promise<void> => {
    // 清理上一次预加载
    if (preloadRef.current.img) {
      preloadRef.current.img.onload = null
      preloadRef.current.img.onerror = null
      preloadRef.current.img.src = ''
      preloadRef.current.img = undefined
    }
    if (preloadRef.current.video) {
      preloadRef.current.video.onloadeddata = null
      preloadRef.current.video.onerror = null
      preloadRef.current.video.src = ''
      preloadRef.current.video = undefined
    }

    return new Promise((resolve, reject) => {
      if (item.type === 'image') {
        const img = new Image()
        preloadRef.current.img = img
        img.onload = () => { log('preload OK:', item.src.slice(0, 60)); resolve() }
        img.onerror = () => { warn('preload FAIL:', item.src.slice(0, 80)); reject() }
        img.src = item.src
      } else {
        const v = document.createElement('video')
        preloadRef.current.video = v
        v.preload = 'auto'
        v.muted = true
        v.onloadeddata = () => { log('preload OK (video):', item.src.slice(0, 60)); resolve() }
        v.onerror = () => { warn('preload FAIL (video):', item.src.slice(0, 80)); reject() }
        v.src = item.src
      }
    })
  }

  // 当前可见层的派生状态
  const visibleItem = showA ? itemA : itemB
  const visibleLoaded = showA ? loadedA : loadedB
  const visibleError = showA ? errA : errB

  // 准备下一个
  const prepareNext = () => {
    if (getActiveMediaPool().length <= 1) return
    if (nextRef.current) return
    try {
      const n = drawRandomMedia()
      nextRef.current = n
      nextReadyRef.current = false
      log('prepareNext:', n.src.slice(0, 60))
      preload(n)
        .then(() => { nextReadyRef.current = true; log('prepareNext ready') })
        .catch(() => { nextRef.current = null; nextReadyRef.current = false; warn('prepareNext preload failed') })
    } catch (e) {
      warn('prepareNext exception:', e)
    }
  }

  // 执行切换
  const doSwitch = () => {
    if (switchingRef.current) { warn('doSwitch blocked: switching'); return }
    const n = nextRef.current
    if (!n) { warn('doSwitch: no next item'); return }

    // 清除可能残留的图片展示计时器
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }

    switchingRef.current = true
    const targetIsA = !showA
    const wasReady = nextReadyRef.current
    log('doSwitch →', targetIsA ? 'A' : 'B', 'ready=', wasReady, n.src.slice(0, 60))

    if (targetIsA) {
      setItemA(n); setLoadedA(wasReady); setErrA(false)
    } else {
      setItemB(n); setLoadedB(wasReady); setErrB(false)
    }
    setShowA(targetIsA)

    nextRef.current = null
    nextReadyRef.current = false

    if (!wasReady) {
      const setL = targetIsA ? setLoadedA : setLoadedB
      const setE = targetIsA ? setErrA : setErrB
      preload(n).then(() => setL(true)).catch(() => setE(true))
    }

    unlockTimerRef.current = setTimeout(() => {
      switchingRef.current = false
      log('unlock, prepare next')
      prepareNext()
      // 如果下一个是图片，启动固定间隔计时器；视频由 onEnded 驱动，无需计时器
      if (n.type === 'image') {
        startImageTimer()
      }
    }, 350)
  }

  // ---- 图片固定间隔切换计时器（仅图片使用）----
  const startImageTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    log('startImageTimer:', IMAGE_DISPLAY_MS, 'ms')
    timerRef.current = setTimeout(() => {
      if (nextRef.current) {
        doSwitch()
      } else {
        prepareNext()
        timerRef.current = setTimeout(() => {
          if (nextRef.current) doSwitch()
        }, 1000)
      }
    }, IMAGE_DISPLAY_MS)
  }

  // ---- 外部 media 变化：首张素材 ----
  useEffect(() => {
    if (!media) return
    log('media prop changed:', media.src.slice(0, 60))
    setItemA(media); setItemB(null)
    setLoadedA(false); setLoadedB(false)
    setErrA(false); setErrB(false)
    setShowA(true)
    switchingRef.current = false
    nextRef.current = null; nextReadyRef.current = false
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (unlockTimerRef.current) { clearTimeout(unlockTimerRef.current); unlockTimerRef.current = null }
    preload(media).then(() => { log('first media loaded'); setLoadedA(true) }).catch(() => { warn('first media failed'); setErrA(true) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media])

  // ---- 可见层就绪后：预加载下一个；如果是图片则启动固定计时器 ----
  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }

    if (visibleItem && visibleLoaded && !nextRef.current && !switchingRef.current) {
      prepareNext()
    }

    if (!visibleItem || !visibleLoaded || switchingRef.current) return

    // 视频：由 onEnded 事件驱动切换，不需要计时器
    if (visibleItem.type === 'video') {
      log('video visible, waiting for onEnded')
      return
    }

    // 图片：固定 5s 后切换
    log('image visible, startImageTimer')
    timerRef.current = setTimeout(() => {
      if (nextRef.current) {
        doSwitch()
      } else {
        prepareNext()
        timerRef.current = setTimeout(() => {
          if (nextRef.current) doSwitch()
        }, 1000)
      }
    }, IMAGE_DISPLAY_MS)

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItem, visibleLoaded])

  // ---- 可见层加载失败 ----
  useEffect(() => {
    if (!visibleError) return
    warn('visible layer error! src=', (showA ? itemA : itemB)?.src?.slice(0, 80))
    const t = setTimeout(() => {
      if (nextRef.current) {
        doSwitch()
      } else {
        prepareNext()
        setTimeout(() => { if (nextRef.current) doSwitch() }, 500)
      }
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleError])

  // 视频播完 → 切换到下一个
  const handleVideoEnded = () => {
    if (switchingRef.current) { warn('video ended blocked: switching'); return }
    log('video ended')
    if (nextRef.current) {
      doSwitch()
    } else {
      prepareNext()
      setTimeout(() => { if (nextRef.current && !switchingRef.current) doSwitch() }, 300)
    }
  }

  // 卸载清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current)
      // 清理预加载元素，防止内存泄漏
      if (preloadRef.current.img) {
        preloadRef.current.img.onload = null
        preloadRef.current.img.onerror = null
        preloadRef.current.img.src = ''
      }
      if (preloadRef.current.video) {
        preloadRef.current.video.onloadeddata = null
        preloadRef.current.video.onerror = null
        preloadRef.current.video.src = ''
      }
    }
  }, [])

  // ====== 空状态 ======
  if (!itemA && !itemB) {
    const cls = fullscreen
      ? 'absolute inset-0 bg-slate-900/95'
      : 'w-full h-[220px] rounded-xl bg-slate-800/50'
    return (
      <div className={`${cls} flex flex-col items-center justify-center gap-2`}>
        <span className="text-slate-500 text-sm">无媒体</span>
        <span className="text-slate-600 text-xs">请前往「设置」上传自定义素材</span>
      </div>
    )
  }

  const fit = fullscreen ? 'object-contain' : 'object-cover'

  const renderMedia = (
    item: MediaItem | null,
    opts: { onLoaded?: () => void; onError?: () => void; onVideoEnded?: () => void; kbClass?: string; videoRef?: React.RefObject<HTMLVideoElement | null> }
  ) => {
    if (!item) return null
    if (item.type === 'image') {
      return (
        <img
          src={item.src}
          alt=""
          className={`w-full h-full ${fit} ${opts.kbClass ?? ''}`}
          onLoad={opts.onLoaded}
          onError={opts.onError}
          draggable={false}
        />
      )
    }
    return (
      <video
        ref={opts.videoRef as React.RefObject<HTMLVideoElement>}
        className={`w-full h-full ${fit}`}
        src={item.src}
        autoPlay playsInline
        muted={!soundEnabled}
        onLoadedData={opts.onLoaded}
        onEnded={opts.onVideoEnded}
        onError={opts.onError}
      />
    )
  }

  // ====== 全屏模式 ======
  if (fullscreen) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ opacity: showA ? 1 : 0, transition: 'opacity 0.3s ease', willChange: 'opacity' }}
        >
          {renderMedia(itemA, {
            onLoaded: () => { log('A loaded'); setLoadedA(true) },
            onError: () => { warn('A error, src=', itemA?.src?.slice(0, 80)); setErrA(true) },
            onVideoEnded: handleVideoEnded,
            kbClass: 'ken-burns-a',
            videoRef: videoARef,
          })}
        </div>
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ opacity: showA ? 0 : 1, transition: 'opacity 0.3s ease', willChange: 'opacity' }}
        >
          {renderMedia(itemB, {
            onLoaded: () => { log('B loaded'); setLoadedB(true) },
            onError: () => { warn('B error, src=', itemB?.src?.slice(0, 80)); setErrB(true) },
            onVideoEnded: handleVideoEnded,
            kbClass: 'ken-burns-b',
            videoRef: videoBRef,
          })}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        {!visibleLoaded && !visibleError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <div className="w-10 h-10 rounded-full border-2 border-neon-blue border-t-transparent animate-spin" />
          </div>
        )}
        {visibleError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <span className="text-slate-500 text-sm">加载失败，切换中...</span>
          </div>
        )}
      </div>
    )
  }

  // ====== 内嵌模式 ======
  return (
    <div className="w-full h-[220px] rounded-xl overflow-hidden bg-slate-900/50 relative mb-4">
      <div className="absolute inset-0" style={{ opacity: showA ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        {renderMedia(itemA, {
          onLoaded: () => { log('A loaded'); setLoadedA(true) },
          onError: () => { warn('A error, src=', itemA?.src?.slice(0, 80)); setErrA(true) },
          onVideoEnded: handleVideoEnded,
          videoRef: videoARef,
        })}
      </div>
      <div className="absolute inset-0" style={{ opacity: showA ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        {renderMedia(itemB, {
          onLoaded: () => { log('B loaded'); setLoadedB(true) },
          onError: () => { warn('B error, src=', itemB?.src?.slice(0, 80)); setErrB(true) },
          onVideoEnded: handleVideoEnded,
          videoRef: videoBRef,
        })}
      </div>
      {!visibleLoaded && !visibleError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
          <div className="w-10 h-10 rounded-full border-2 border-neon-blue border-t-transparent animate-spin" />
        </div>
      )}
      {visibleError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
          <span className="text-slate-500 text-sm">加载失败</span>
        </div>
      )}
    </div>
  )
}
