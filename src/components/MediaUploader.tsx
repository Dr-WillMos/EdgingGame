/**
 * 自定义素材管理组件
 * ========================================
 * 支持拖拽/点击上传图片与视频，存储到 IndexedDB。
 * 上传后自动加入媒体库，可预览、删除。
 *
 * 通过 mode 属性区分两种素材库：
 *   - 'normal' : 常规撸动素材（踩格子时随机播放）
 *   - 'climax' : 通关高潮专属素材（到达终点时展示）
 */

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Trash2, Film, Eye } from 'lucide-react'
import { mediaDB, climaxMediaDB, type MediaFileRecord } from '../utils/mediaDB'
import {
  addCustomMedia,
  removeCustomMedia,
  addClimaxMedia,
  removeClimaxMedia,
} from '../config/mediaConfig'

export interface MediaUploaderHandle {
  /** 刷新素材列表 */
  refresh: () => Promise<void>
}

interface MediaUploaderProps {
  /** 素材库模式：常规撸动素材 / 通关高潮专属素材 */
  mode?: 'normal' | 'climax'
}

const MediaUploader = forwardRef<MediaUploaderHandle, MediaUploaderProps>(function MediaUploader(
  { mode = 'normal' },
  ref
) {
  const isClimax = mode === 'climax'
  const [files, setFiles] = useState<MediaFileRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image')
  const inputRef = useRef<HTMLInputElement>(null)
  /** 缓存 blob URL，避免每次渲染重复创建 */
  const blobUrlCache = useRef<Map<number, string>>(new Map())

  // 根据模式选择对应的 DB 操作对象
  const db = isClimax ? climaxMediaDB : mediaDB

  // 加载已有记录
  const refresh = useCallback(async () => {
    try {
      const list = await db.getAll()
      setFiles(list)
    } catch {
      setFiles([])
    }
  }, [db])

  // 暴露 refresh 方法供父组件调用
  useImperativeHandle(ref, () => ({
    refresh,
  }))

  // 首次加载 + 模式切换时重新加载
  useEffect(() => {
    refresh()
  }, [refresh])

  // 组件卸载时释放所有缓存的 blob URL
  useEffect(() => {
    return () => {
      blobUrlCache.current.forEach((url) => URL.revokeObjectURL(url))
      blobUrlCache.current.clear()
    }
  }, [])

  /** 获取或创建 blob URL（带缓存） */
  const getBlobUrl = useCallback((id: number, blob: Blob): string => {
    const cached = blobUrlCache.current.get(id)
    if (cached) return cached
    const url = URL.createObjectURL(blob)
    blobUrlCache.current.set(id, url)
    return url
  }, [])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setLoading(true)
    try {
      const validFiles = Array.from(fileList).filter(
        (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
      )
      for (const file of validFiles) {
        const id = await db.add(file)
        const url = URL.createObjectURL(file)
        blobUrlCache.current.set(id, url)
        const type = file.type.startsWith('video') ? 'video' : 'image'
        if (isClimax) {
          addClimaxMedia(id, url, type)
        } else {
          addCustomMedia(id, url, type)
        }
      }
      await refresh()
    } catch {
      // IndexedDB 不可用或创建 blob URL 失败
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await db.remove(id)
      if (isClimax) {
        removeClimaxMedia(id)
      } else {
        removeCustomMedia(id)
      }
      const cachedUrl = blobUrlCache.current.get(id)
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl)
        blobUrlCache.current.delete(id)
      }
      await refresh()
    } catch {
      // 删除失败
    }
  }

  const handlePreview = (file: MediaFileRecord) => {
    if (file.id === undefined) return
    const url = getBlobUrl(file.id, file.blob)
    setPreviewUrl(url)
    setPreviewType(file.type)
  }

  const closePreview = () => {
    setPreviewUrl(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 文案根据模式调整
  const uploadHint = isClimax ? '上传高潮专属素材' : '拖拽或点击上传素材'
  const emptyHint = isClimax
    ? '暂无高潮素材，通关时将回退到常规素材池'
    : '暂无自定义素材，上方上传即可'

  return (
    <div className="space-y-3">
      {/* 上传区域 */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-neon-blue bg-neon-blue/10'
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className={`w-8 h-8 mx-auto mb-2 ${isClimax ? 'text-neon-yellow' : 'text-slate-400'}`} />
        <p className="text-sm text-slate-300 font-bold">{uploadHint}</p>
        <p className="text-xs text-slate-500 mt-1">支持 JPG、PNG、GIF、WEBP、MP4、WEBM</p>
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className="w-8 h-8 rounded-full border-2 border-neon-blue border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {/* 文件计数 */}
      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">共 {files.length} 个素材</span>
          <button
            onClick={async () => {
              if (confirm('确定清空所有素材？此操作不可撤销。')) {
                for (const f of files) {
                  if (f.id !== undefined) await handleRemove(f.id)
                }
              }
            }}
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            全部清空
          </button>
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {files.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group rounded-lg overflow-hidden bg-slate-800/50 aspect-square"
              >
                {f.type === 'image' && f.id !== undefined ? (
                  <img
                    src={getBlobUrl(f.id, f.blob)}
                    alt={f.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
                    <Film className="w-7 h-7 text-blue-400 mb-1" />
                    <span className="text-[9px] text-slate-500 px-1 truncate max-w-full">{f.name}</span>
                  </div>
                )}
                {/* 类型标签 */}
                <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[8px] font-bold text-white/80">
                  {f.type === 'video' ? '🎬' : '🖼️'}
                </div>
                {/* 悬停操作遮罩 */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <span className="text-[9px] text-slate-300 px-2 text-center break-all line-clamp-2 max-w-full">{f.name}</span>
                  <span className="text-[9px] text-slate-500">{formatSize(f.size)}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(f)
                      }}
                      className="p-1.5 rounded-full bg-slate-600/80 hover:bg-slate-500 text-white transition-colors"
                      title="预览"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (f.id !== undefined) handleRemove(f.id)
                      }}
                      className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {files.length === 0 && !loading && (
        <div className="text-center py-4 text-slate-500 text-xs">{emptyHint}</div>
      )}

      {/* 预览弹窗 */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePreview}
          >
            <motion.div
              className="relative max-w-3xl max-h-[80vh]"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              {previewType === 'image' ? (
                <img src={previewUrl} alt="预览" className="max-w-full max-h-[80vh] rounded-xl" />
              ) : (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] rounded-xl"
                />
              )}
              <button
                onClick={closePreview}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default MediaUploader
