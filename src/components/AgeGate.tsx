/**
 * 年龄验证弹窗
 * ========================================
 * 首次进入时显示，用户确认"已满 18 岁"后方可进入。
 * 选择结果存入 localStorage，刷新后不再弹出。
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

const STORAGE_KEY = 'cunzhi_age_confirmed'

/** 检查是否已确认年龄 */
export function isAgeConfirmed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

interface AgeGateProps {
  onConfirm: () => void
}

export default function AgeGate({ onConfirm }: AgeGateProps) {
  const [denied, setDenied] = useState(false)

  const handleConfirm = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore
    }
    onConfirm()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

        {/* 内容卡片 */}
        <motion.div
          className="relative w-full max-w-md glass-card rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden"
          initial={{ scale: 0.85, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="h-1 bg-gradient-to-r from-transparent via-neon-red to-transparent" />

          <div className="p-8 text-center">
            {/* 警告图标 */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex mb-4"
            >
              <AlertTriangle className="w-14 h-14 text-neon-red" />
            </motion.div>

            {!denied ? (
              <>
                <h2 className="text-xl font-bold text-neon-red neon-text-red mb-3">
                  内容警告
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed mb-2">
                  本游戏包含成人主题内容，仅适合 <span className="text-neon-yellow font-bold">18 岁及以上</span> 用户。
                </p>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  进入即表示你已达到法定成年年龄，并自愿接触此类内容。
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold transition-all btn-cyber"
                  >
                    我已满 18 岁，进入游戏
                  </button>
                  <button
                    onClick={() => setDenied(true)}
                    className="px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-all"
                  >
                    我未满 18 岁，离开
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-300 mb-3">
                  访问受限
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  抱歉，本游戏仅面向成年人开放。
                  <br />
                  感谢你的理解。
                </p>
                <button
                  onClick={() => setDenied(false)}
                  className="px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-all"
                >
                  返回
                </button>
              </>
            )}
          </div>

          {/* 底部小字 */}
          {!denied && (
            <div className="px-8 pb-4 text-center">
              <p className="text-[10px] text-slate-600">
                所有游戏数据均存储在你的浏览器本地，不上传任何服务器。
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
