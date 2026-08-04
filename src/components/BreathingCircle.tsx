/**
 * 呼吸节奏圆环组件
 * ========================================
 * 寸止格触发时显示的呼吸引导动画。
 * 循环：吸气 4s（圆环扩大）→ 屏气 4s（保持）→ 呼气 4s（圆环缩小）
 * 配合倒计时数字与进度环，帮助玩家迅速冷静。
 */

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { soundEngine } from '../utils/soundEngine'

type BreathPhase = 'inhale' | 'hold' | 'exhale'

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: '吸气',
  hold: '屏气',
  exhale: '呼气',
}

const PHASE_DURATIONS: Record<BreathPhase, number> = {
  inhale: 4000,
  hold: 4000,
  exhale: 4000,
}

const PHASE_ORDER: BreathPhase[] = ['inhale', 'hold', 'exhale']

export default function BreathingCircle({ compact = false }: { compact?: boolean }) {
  const edgeCountdown = useGameStore((s) => s.edgeCountdown)
  const completeEdgeCountdown = useGameStore((s) => s.completeEdgeCountdown)
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale')
  const [countdown, setCountdown] = useState(edgeCountdown)
  const phaseIndexRef = useRef(0)

  // 呼吸阶段循环：edgeCountdown 变化时重置为吸气开始
  useEffect(() => {
    phaseIndexRef.current = 0
    setBreathPhase('inhale')
    let timer: number

    const runPhase = () => {
      const phase = PHASE_ORDER[phaseIndexRef.current % 3]
      setBreathPhase(phase)

      timer = window.setTimeout(() => {
        phaseIndexRef.current++
        runPhase()
      }, PHASE_DURATIONS[phase])
    }

    runPhase()

    return () => clearTimeout(timer)
  }, [edgeCountdown])

  // 倒计时
  useEffect(() => {
    setCountdown(edgeCountdown)
    let interval: ReturnType<typeof setInterval> | null = null
    interval = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1
        if (next <= 0) {
          if (interval) clearInterval(interval)
          interval = null
          return 0
        }
        // 播放倒计时提示音
        soundEngine.playCountdownTick(next)
        // 最后 5 秒每秒震动提醒
        if (next <= 5 && 'vibrate' in navigator) {
          try { navigator.vibrate(next === 0 ? 0 : 50) } catch { /* 忽略 */ }
        }
        return next
      })
    }, 1000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [edgeCountdown])

  // 倒计时归零时完成寸止（避免渲染期间 setState）
  useEffect(() => {
    if (countdown === 0) {
      completeEdgeCountdown()
    }
  }, [countdown, completeEdgeCountdown])

  // 圆环大小与颜色随呼吸阶段变化
  const circleScale = breathPhase === 'inhale' ? 1.3 : breathPhase === 'exhale' ? 0.7 : 1.0
  const circleColor =
    breathPhase === 'inhale'
      ? 'rgba(0, 240, 255, 0.4)'
      : breathPhase === 'hold'
        ? 'rgba(255, 230, 0, 0.4)'
        : 'rgba(176, 38, 255, 0.4)'

  // 倒计时进度（0~1），防止 edgeCountdown 为 0 时除零
  const progress = edgeCountdown > 0 ? countdown / edgeCountdown : 0

  return (
    <div className={`flex flex-col items-center ${compact ? '' : 'gap-8 py-4'}`}>
      {/* 倒计时数字 */}
      <div className="text-center">
        {!compact && <div className="text-sm text-slate-400 mb-1">寸止倒计时</div>}
        <motion.div
          key={countdown}
          initial={{ scale: countdown <= 3 ? 2.5 : 1.5, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-bold font-mono ${
            compact
              ? countdown <= 3 ? 'text-4xl' : 'text-2xl'
              : countdown <= 3 ? 'text-8xl' : 'text-6xl'
          } ${
            countdown <= 3
              ? 'text-neon-red'
              : countdown <= 5
                ? 'text-neon-red neon-text-red'
                : 'text-neon-yellow neon-text-yellow'
          } ${
            countdown <= 3 ? 'animate-heartbeat-pulse' : ''
          }`}
        >
          {countdown}s
        </motion.div>
      </div>

      {/* 呼吸圆环 */}
      <div className={`relative flex items-center justify-center ${compact ? 'w-24 h-24' : 'w-64 h-64'}`}>
        {/* 进度环（背景） */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth="2" />
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={countdown <= 5 ? '#FF0055' : '#00F0FF'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 46}`}
            initial={{ strokeDashoffset: 0 }}
            animate={{
              strokeDashoffset: 2 * Math.PI * 46 * (1 - progress),
            }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>

        {/* 呼吸圆 */}
        <motion.div
          className={`absolute rounded-full border-2 ${compact ? 'w-20 h-20' : 'w-52 h-52'} flex items-center justify-center`}
          animate={{
            scale: circleScale,
            backgroundColor: circleColor,
          }}
          transition={{
            duration: PHASE_DURATIONS[breathPhase] / 1000,
            ease: 'easeInOut',
          }}
          style={{ width: compact ? 60 : 160, height: compact ? 60 : 160 }}
        >
          <span className={`font-bold text-white drop-shadow-lg ${compact ? 'text-xs' : 'text-2xl'}`}>
            {PHASE_LABELS[breathPhase]}
          </span>
        </motion.div>
      </div>

      {!compact && (
        <p className="text-slate-400 text-sm text-center max-w-xs">
          跟随圆环节奏呼吸，保持冷静。倒计时结束后自动继续。
        </p>
      )}
    </div>
  )
}
