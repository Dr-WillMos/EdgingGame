/**
 * 格子事件弹窗组件
 * ========================================
 * - EDGE/SLOW/MEDIUM/FAST（撸动事件）：全屏沉浸式，媒体铺满 + 字幕式控件
 * - CHANCE/LUBE/ARROW（非撸动事件）：居中卡片式弹窗
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef, useMemo } from 'react'
import { ArrowUpRight, ArrowDownLeft, Droplet } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { soundEngine } from '../utils/soundEngine'
import BreathingCircle from './BreathingCircle'
import BPMMetronome from './BPMMetronome'
import ChanceCardDisplay from './ChanceCardDisplay'
import MediaPlayer from './MediaPlayer'

export default function EventModal() {
  const activeModal = useGameStore((s) => s.activeModal)
  const useItem = useGameStore((s) => s.useItem)
  const currentMedia = useGameStore((s) => s.currentMedia)
  const iceCardCount = useGameStore((s) => s.player.items.ICE_CARD)
  const currentTile = useGameStore((s) => s.tiles[s.player.position])
  // BPM 脉冲联动
  const bpmBeatCount = useGameStore((s) => s.bpmBeatCount)
  const [beatTrigger, setBeatTrigger] = useState(0)
  const prevBeatRef = useRef(0)
  const mediaEffect = useSettingsStore((s) => s.settings.mediaEffect)

  useEffect(() => {
    if (bpmBeatCount > 0 && bpmBeatCount !== prevBeatRef.current) {
      prevBeatRef.current = bpmBeatCount
      setBeatTrigger((n) => n + 1)
    }
  }, [bpmBeatCount])

  const isImmersive = activeModal === 'EDGE' || activeModal === 'SLOW' || activeModal === 'MEDIUM' || activeModal === 'FAST'

  // 缓存 wave 效果的 SVG filter URL（仅依赖 intensity）
  const waveFilterUrl = useMemo(() => {
    const t = mediaEffect.intensity / 10
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='turbulence' baseFrequency='${0.01 + t * 0.02}' numOctaves='2' result='n'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='n' scale='${t * 12}'/%3E%3C/filter%3E%3C/svg%3E%23w")`
  }, [mediaEffect.intensity])

  // 根据设置计算当前帧的 transform 样式
  const effectStyle = useMemo((): React.CSSProperties => {
    if (!mediaEffect.enabled || !isImmersive) return {}

    const t = mediaEffect.intensity / 10
    const active = beatTrigger > 0

    switch (mediaEffect.mode) {
      case 'pulse':
        return {
          transform: active ? `scale(${1 + t * 0.03})` : 'scale(1)',
          transition: 'transform 0.08s ease-out',
        }
      case 'shake': {
        // 基于 beatTrigger 的确定性伪随机，避免渲染期多次调用 Math.random
        const seed = beatTrigger * 9301 + 49297
        const rx = ((seed % 233280) / 233280) - 0.5
        const ry = (((seed * 7) % 233280) / 233280) - 0.5
        const x = active ? rx * t * 8 : 0
        const y = active ? ry * t * 8 : 0
        return {
          transform: `translate(${x}px, ${y}px)`,
          transition: 'transform 0.06s ease-out',
        }
      }
      case 'zoom': {
        const s = 1 + t * 0.04 * Math.sin(beatTrigger * 0.5)
        return {
          transform: `scale(${s})`,
          transition: 'transform 0.15s ease-in-out',
        }
      }
      case 'rotate': {
        const seedR = ((beatTrigger * 13 + 9301) % 233280) / 233280 - 0.5
        const r = active ? seedR * t * 3 : 0
        return {
          transform: `rotate(${r}deg)`,
          transition: 'transform 0.1s ease-out',
        }
      }
      case 'wave':
        return {
          filter: active ? waveFilterUrl : 'none',
          transition: 'filter 0.1s ease-out',
        }
      default:
        return {}
    }
  }, [beatTrigger, mediaEffect.enabled, mediaEffect.mode, mediaEffect.intensity, isImmersive, waveFilterUrl])

  const getModalTitle = (): string => {
    switch (activeModal) {
      case 'EDGE': return '寸止挑战'
      case 'SLOW': return '慢速节拍'
      case 'MEDIUM': return '中速节拍'
      case 'FAST': return '快速节拍'
      case 'CHANCE': return '命运抽卡'
      case 'LUBE': return '润滑补给'
      case 'ARROW': return '方向格'
      default: return ''
    }
  }

  const getAccentColor = (): string => {
    switch (activeModal) {
      case 'EDGE': return 'text-neon-yellow'
      case 'SLOW': return 'text-blue-400'
      case 'MEDIUM': return 'text-cyan-400'
      case 'FAST': return 'text-sky-400'
      case 'CHANCE': return 'text-neon-purple'
      case 'LUBE': return 'text-red-400'
      case 'ARROW': return 'text-orange-400'
      default: return 'text-slate-400'
    }
  }

  const hasIceCard = iceCardCount > 0

  // 撸动事件期间播放环境音，关闭时停止
  useEffect(() => {
    if (isImmersive) {
      soundEngine.startAmbient()
      return () => soundEngine.stopAmbient()
    }
  }, [isImmersive])

  // ====== 撸动事件：全屏沉浸式 ======
  if (isImmersive) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0" style={effectStyle}>
            <MediaPlayer media={currentMedia} fullscreen />
          </div>

          {/* 左上角：小标签 + 冷静卡 */}
          <motion.div
            className="absolute top-3 left-3 z-10 flex items-center gap-2"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getAccentColor()} bg-black/40`}>
                {getModalTitle()}
              </span>
              <ComboBadge />
            </div>
            <button
              onClick={() => useItem('ICE_CARD')}
              disabled={!hasIceCard}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                hasIceCard ? 'bg-white/20 text-white/90 hover:bg-white/30' : 'text-white/20'
              }`}
            >
              🛡️ {iceCardCount}
            </button>
          </motion.div>

          {/* 底部字幕式控件 */}
          <motion.div
            className="absolute bottom-3 inset-x-3 z-10"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activeModal === 'EDGE' && <BreathingCircle compact />}
            {(activeModal === 'SLOW' || activeModal === 'MEDIUM' || activeModal === 'FAST') && (
              <BPMMetronome speed={activeModal as 'SLOW' | 'MEDIUM' | 'FAST'} compact />
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ====== 非撸动事件：卡片式弹窗 ======
  return (
    <AnimatePresence>
      {activeModal && activeModal !== 'STATS' && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-lg glass-card rounded-3xl border border-slate-600/80 shadow-2xl overflow-hidden"
            initial={{ scale: 0.8, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent" />
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className={`text-lg font-bold ${getAccentColor()}`}>{getModalTitle()}</h2>
            </div>
            <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
              {activeModal === 'CHANCE' && <ChanceCardDisplay />}
              {activeModal === 'LUBE' && <LubeContent />}
              {activeModal === 'ARROW' && <ArrowContent arrowStep={currentTile?.arrowStep ?? 0} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ComboBadge() {
  const combo = useGameStore((s) => s.stats.combo)
  if (combo < 2) return null
  return (
    <motion.span
      key={combo}
      initial={{ scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white"
    >
      {combo} COMBO
    </motion.span>
  )
}

function LubeContent() {
  const closeModal = useGameStore((s) => s.closeModal)
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        <Droplet className="w-20 h-20 text-red-400" />
      </motion.div>
      <div className="text-center">
        <h3 className="text-xl font-bold text-red-400 mb-2">润滑补给站</h3>
        <p className="text-slate-300 text-sm">踩中润滑格，恢复 1 点能量。调整呼吸，继续前进。</p>
      </div>
      <button
        onClick={closeModal}
        className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold btn-cyber transition-all"
      >继续</button>
    </div>
  )
}

function ArrowContent({ arrowStep }: { arrowStep: number }) {
  const isForward = arrowStep > 0
  const Icon = isForward ? ArrowUpRight : ArrowDownLeft
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <motion.div
        animate={{
          x: isForward ? [0, 20, 0] : [0, -20, 0],
          rotate: isForward ? [0, 15, 0] : [0, -15, 0],
        }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <Icon className={`w-20 h-20 ${isForward ? 'text-green-400' : 'text-red-400'}`} />
      </motion.div>
      <div className="text-center">
        <h3 className={`text-2xl font-bold ${isForward ? 'text-green-400' : 'text-red-400'} mb-2`}>
          {isForward ? '加速前进' : '被迫后退'}
        </h3>
        <p className="text-slate-300 text-sm">
          {isForward ? `方向格发动！前进 ${arrowStep} 格` : `方向格反转！后退 ${Math.abs(arrowStep)} 格`}
        </p>
      </div>
    </div>
  )
}
