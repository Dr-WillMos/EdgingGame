/**
 * BPM 节拍器组件
 * ========================================
 * 慢速/中速/快速格触发时显示的可视化节拍器。
 * 基于 Web Audio API 实时生成节拍音，配合脉冲动画与计数器。
 * 纯自动跟随节拍计数，用户无需操作，完成全部次数后自动关闭。
 */

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { soundEngine } from '../utils/soundEngine'
import { BPM_CONFIG } from '../config/mapData'

/** 节拍速度档位 */
type BPMSpeed = 'SLOW' | 'MEDIUM' | 'FAST'

interface BPMMetronomeProps {
  /** 速度档位 */
  speed: BPMSpeed
  /** 紧凑模式（全屏沉浸式时使用） */
  compact?: boolean
}

export default function BPMMetronome({ speed, compact = false }: BPMMetronomeProps) {
  const bpmBeatCount = useGameStore((s) => s.bpmBeatCount)
  const bpmTotalBeats = useGameStore((s) => s.bpmTotalBeats)
  const bpmLabel = useGameStore((s) => s.bpmLabel)
  const addBPMBeat = useGameStore((s) => s.addBPMBeat)
  const completeBPM = useGameStore((s) => s.completeBPM)
  const settings = useSettingsStore((s) => s.settings)

  // 从设置中读取 BPM 值，回退到静态配置
  const bpmValue = settings[`bpm${speed.charAt(0)}${speed.slice(1).toLowerCase()}` as keyof typeof settings] as { bpm: number }
  const config = {
    bpm: bpmValue?.bpm ?? BPM_CONFIG[speed].bpm,
    color: BPM_CONFIG[speed].color,
  }
  const [isPulsing, setIsPulsing] = useState(false)

  // 用 ref 持有最新的 addBPMBeat，避免 callback 引用过期
  const addBPMBeatRef = useRef(addBPMBeat)
  addBPMBeatRef.current = addBPMBeat

  // StrictMode 防护：防止 mount → cleanup → mount 导致重复启动
  const startedRef = useRef(false)

  // 启动节拍器（通过 ref 读取最新回调，避免重复启动）
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    soundEngine.startMetronome(
      config.bpm,
      bpmTotalBeats,
      () => {
        addBPMBeatRef.current()
        setIsPulsing(true)
        setTimeout(() => setIsPulsing(false), 100)
        // 震动反馈：速度越快震动越短促
        if ('vibrate' in navigator) {
          const pattern = speed === 'FAST' ? 15 : speed === 'MEDIUM' ? 25 : 40
          try { navigator.vibrate(pattern) } catch { /* 忽略 */ }
        }
      },
      undefined
    )

    return () => {
      startedRef.current = false
      soundEngine.stopMetronome()
    }
  }, [config.bpm, bpmTotalBeats, speed])

  // 检查是否完成
  useEffect(() => {
    if (bpmBeatCount >= bpmTotalBeats) {
      completeBPM()
    }
  }, [bpmBeatCount, bpmTotalBeats, completeBPM])

  const progress = bpmTotalBeats > 0 ? (bpmBeatCount / bpmTotalBeats) * 100 : 0
  const remaining = Math.max(0, bpmTotalBeats - bpmBeatCount)

  if (compact) {
    return (
      <div className="flex items-center gap-4 w-full max-w-md">
        {/* 脉冲圆（小） */}
        <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
          <motion.div
            className="absolute rounded-full border-2"
            style={{ borderColor: config.color }}
            animate={{
              scale: isPulsing ? [1, 1.3, 1] : 1,
              opacity: isPulsing ? [0.6, 0.2, 0.6] : 0.6,
            }}
            transition={{ duration: 0.1 }}
          />
          <motion.div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              backgroundColor: config.color + '30',
              border: `2px solid ${config.color}`,
            }}
            animate={{ scale: isPulsing ? 1.1 : 1 }}
            transition={{ duration: 0.08 }}
          >
            <span className="text-sm font-bold font-mono" style={{ color: config.color }}>
              {bpmBeatCount}/{bpmTotalBeats}
            </span>
          </motion.div>
        </div>

        {/* 进度条 + 标签 */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span style={{ color: config.color }}>{bpmLabel} · {config.bpm} BPM</span>
            <span>{remaining} 次剩余</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: config.color }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* 标题 */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-neon-blue neon-text-blue">{bpmLabel}</h3>
        <p className="text-slate-400 text-sm mt-1">
          {config.bpm} BPM · 跟随节拍完成 {bpmTotalBeats} 次撸动
        </p>
      </div>

      {/* 脉冲圆环 */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        <motion.div
          className="absolute rounded-full border-2"
          style={{ borderColor: config.color }}
          animate={{
            scale: isPulsing ? [1, 1.3, 1] : 1,
            opacity: isPulsing ? [0.6, 0.2, 0.6] : 0.6,
          }}
          transition={{ duration: 0.1 }}
        />
        <motion.div
          className="absolute rounded-full border"
          style={{ borderColor: config.color }}
          animate={{
            scale: isPulsing ? [1, 1.5, 1] : 1,
            opacity: isPulsing ? [0.4, 0, 0.4] : 0.4,
          }}
          transition={{ duration: 0.15 }}
        />
        <motion.div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 100,
            height: 100,
            backgroundColor: config.color + '30',
            border: `2px solid ${config.color}`,
          }}
          animate={{
            scale: isPulsing ? 1.1 : 1,
          }}
          transition={{ duration: 0.08 }}
        >
          <div className="text-center">
            <div className="text-3xl font-bold font-mono" style={{ color: config.color }}>
              {bpmBeatCount}
            </div>
            <div className="text-xs text-slate-400">/ {bpmTotalBeats}</div>
          </div>
        </motion.div>
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>进度</span>
          <span>{remaining} 次剩余</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* 提示文字 */}
      <p className="text-slate-400 text-xs text-center max-w-xs">
        跟随节拍节奏即可，无需操作。完成全部次数后自动继续。
      </p>
    </div>
  )
}
