/**
 * 通关高潮庆祝场景
 * ========================================
 * 到达终点格时触发的沉浸式高潮庆祝。
 * 三阶段动画：蓄势 → 释放 → 余韵
 * 配合音效引擎的扫频蓄势音和爆发释放音。
 */

import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { soundEngine } from '../utils/soundEngine'
import MediaPlayer from './MediaPlayer'

type ClimaxPhase = 'buildup' | 'release' | 'afterglow'

/** 各阶段时长（毫秒） */
const PHASE_DURATIONS: Record<ClimaxPhase, number> = {
  buildup: 4000,
  release: 3000,
  afterglow: 4000,
}

/** 蓄势阶段脉冲频率递增 */
const BUILDUP_PULSES = [800, 600, 450, 350, 250, 180, 120, 80]

/** 释放粒子数量 */
const RELEASE_PARTICLES = 80

interface Particle {
  id: number
  angle: number
  distance: number
  delay: number
  color: string
  size: number
  speed: number
}

const PARTICLE_COLORS = ['#FFE600', '#00F0FF', '#FF0055', '#B026FF', '#39FF14', '#FFFFFF', '#FF6B00']

export default function ClimaxScene() {
  const activeModal = useGameStore((s) => s.activeModal)
  const currentMedia = useGameStore((s) => s.currentMedia)
  const completeClimax = useGameStore((s) => s.completeClimax)
  const stats = useGameStore((s) => s.stats)
  const soundEnabled = useSettingsStore((s) => s.settings.soundEnabled)

  const [phase, setPhase] = useState<ClimaxPhase>('buildup')
  const [pulseIndex, setPulseIndex] = useState(0)
  const [showButton, setShowButton] = useState(false)
  // 倒计时引导状态
  const [countdown, setCountdown] = useState(Math.ceil(PHASE_DURATIONS.buildup / 1000))
  const [progress, setProgress] = useState(0)
  const [showReleasePrompt, setShowReleasePrompt] = useState(false)
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  // rAF 优化：用 ref 记录上次渲染值，仅在变化时 setState
  const lastRenderedCountdown = useRef(countdown)
  const lastRenderedProgress = useRef(0)
  const lastRenderedPrompt = useRef(false)

  // 生成释放粒子（仅一次）
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: RELEASE_PARTICLES }).map((_, i) => ({
      id: i,
      angle: (i / RELEASE_PARTICLES) * Math.PI * 2 + Math.random() * 0.3,
      distance: 150 + Math.random() * 300,
      delay: Math.random() * 0.3,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      size: 3 + Math.random() * 12,
      speed: 0.8 + Math.random() * 1.5,
    }))
  }, [])

  // 阶段推进逻辑
  useEffect(() => {
    if (activeModal !== 'CLIMAX') return

    setPhase('buildup')
    setPulseIndex(0)
    setShowButton(false)
    setCountdown(Math.ceil(PHASE_DURATIONS.buildup / 1000))
    setProgress(0)
    setShowReleasePrompt(false)

    // 启动蓄势音效
    if (soundEnabled) {
      soundEngine.playClimaxBuildup(PHASE_DURATIONS.buildup / 1000)
    }

    // 蓄势阶段：递增脉冲（使用局部索引避免闭包过期）
    let localPulseIndex = 0
    const runPulses = () => {
      if (localPulseIndex >= BUILDUP_PULSES.length) return
      const delay = BUILDUP_PULSES[localPulseIndex]
      pulseTimerRef.current = setTimeout(() => {
        localPulseIndex++
        setPulseIndex(localPulseIndex)
        if (localPulseIndex < BUILDUP_PULSES.length) {
          pulseTimerRef.current = setTimeout(runPulses, BUILDUP_PULSES[localPulseIndex])
        }
      }, delay)
    }
    runPulses()

    // 蓄势 → 释放
    phaseTimerRef.current = setTimeout(() => {
      setPhase('release')
      // 释放音效
      if (soundEnabled) {
        soundEngine.playClimaxRelease()
      }
      // 震动反馈
      if ('vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 200, 50, 400]) } catch { /* 忽略 */ }
      }

      // 释放 → 余韵
      phaseTimerRef.current = setTimeout(() => {
        setPhase('afterglow')

        // 余韵结束后显示按钮
        phaseTimerRef.current = setTimeout(() => {
          setShowButton(true)
        }, PHASE_DURATIONS.afterglow)
      }, PHASE_DURATIONS.release)
    }, PHASE_DURATIONS.buildup)

    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal])

  // 蓄势阶段倒计时引导（rAF 循环，不影响阶段推进逻辑）
  useEffect(() => {
    if (activeModal !== 'CLIMAX' || phase !== 'buildup') return

    const startTime = Date.now()
    const duration = PHASE_DURATIONS.buildup

    const tick = () => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      const currentProgress = Math.min(1, elapsed / duration)
      const currentCountdown = Math.ceil(remaining / 1000)
      const currentPrompt = remaining <= 1000 && remaining > 0

      // 进度条：变化超过 0.5% 才触发重渲染
      if (Math.abs(currentProgress - lastRenderedProgress.current) >= 0.005) {
        lastRenderedProgress.current = currentProgress
        setProgress(currentProgress)
      }
      // 倒计时数字：仅整秒变化时更新
      if (currentCountdown !== lastRenderedCountdown.current) {
        lastRenderedCountdown.current = currentCountdown
        setCountdown(currentCountdown)
      }
      // 释放提示：仅开关切换时更新
      if (currentPrompt !== lastRenderedPrompt.current) {
        lastRenderedPrompt.current = currentPrompt
        setShowReleasePrompt(currentPrompt)
      }

      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal, phase])

  if (activeModal !== 'CLIMAX') return null

  // 蓄势强度（0~1，随脉冲递增）
  const buildupIntensity = phase === 'buildup'
    ? Math.min(1, (pulseIndex + 1) / BUILDUP_PULSES.length)
    : 0

  // 释放阶段白色闪光透明度
  const flashOpacity = phase === 'release' ? [0, 0.9, 0.3, 0] : 0

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] overflow-hidden bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ===== 媒体背景层 ===== */}
        {currentMedia && (
          <div
            className="absolute inset-0"
            style={{
              transform: phase === 'buildup'
                ? `scale(${1 + buildupIntensity * 0.08})`
                : phase === 'release'
                  ? 'scale(1.15)'
                  : 'scale(1.05)',
              transition: 'transform 0.3s ease-out',
              filter: phase === 'buildup'
                ? `brightness(${0.5 + buildupIntensity * 0.5}) saturate(${1 + buildupIntensity * 0.5})`
                : phase === 'release'
                  ? 'brightness(1.5) saturate(1.8) contrast(1.2)'
                  : 'brightness(0.7) saturate(0.8) blur(2px)',
            }}
          >
            <MediaPlayer media={currentMedia} fullscreen />
          </div>
        )}

        {/* ===== 蓄势阶段：倒计时引导 + 脉冲遮罩 ===== */}
        {phase === 'buildup' && (
          <>
            {/* 顶部进度条 */}
            <div className="absolute top-0 left-0 right-0 z-10 h-1.5 bg-slate-800/60">
              <div
                className="h-full transition-[width] duration-100 ease-linear"
                style={{
                  width: `${progress * 100}%`,
                  background: progress < 0.5
                    ? 'linear-gradient(90deg, #475569, #0ea5e9)'
                    : progress < 0.75
                      ? 'linear-gradient(90deg, #0ea5e9, #facc15)'
                      : 'linear-gradient(90deg, #facc15, #ef4444)',
                  boxShadow: progress > 0.75
                    ? `0 0 ${8 + (progress - 0.75) * 40}px rgba(239, 68, 68, ${0.4 + (progress - 0.75) * 2})`
                    : 'none',
                }}
              />
            </div>

            {/* 脉冲暗角 */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at center, transparent ${30 + buildupIntensity * 20}%, rgba(0,0,0,${0.3 + buildupIntensity * 0.4}) 100%)`,
              }}
              animate={{
                opacity: [0.6 - buildupIntensity * 0.3, 0.9 - buildupIntensity * 0.2, 0.6 - buildupIntensity * 0.3],
              }}
              transition={{
                duration: BUILDUP_PULSES[Math.min(pulseIndex, BUILDUP_PULSES.length - 1)] / 1000,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* "准备释放"红色脉冲遮罩（最后 1 秒） */}
            <AnimatePresence>
              {showReleasePrompt && (
                <motion.div
                  className="absolute inset-0 bg-red-600/30"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0.15, 0.4, 0.15],
                  }}
                  transition={{ duration: 0.3, repeat: Infinity, ease: 'easeInOut' }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            {/* 蓄势文字 + 倒计时 */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1 + buildupIntensity * 0.15, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: BUILDUP_PULSES[Math.min(pulseIndex, BUILDUP_PULSES.length - 1)] / 1000,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-center"
              >
                {/* 倒计时数字 */}
                <motion.p
                  key={countdown}
                  initial={{ scale: 1.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={`text-7xl md:text-9xl font-black font-mono tabular-nums mb-3 ${
                    countdown <= 1
                      ? 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,1)]'
                      : countdown <= 2
                        ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]'
                        : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]'
                  }`}
                >
                  {countdown}
                </motion.p>
                <p className="text-2xl md:text-4xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,230,0,0.8)] mb-2">
                  即将到达临界点
                </p>
                <p className="text-sm md:text-lg text-neon-yellow drop-shadow-[0_0_10px_rgba(255,230,0,0.6)]">
                  {Math.round(buildupIntensity * 100)}%
                </p>
              </motion.div>

              {/* "准备释放" 提示文字 */}
              <AnimatePresence>
                {showReleasePrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-center mt-6"
                  >
                    <motion.p
                      animate={{
                        scale: [1, 1.15, 1],
                      }}
                      transition={{ duration: 0.25, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-3xl md:text-5xl font-black text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]"
                    >
                      准备释放
                    </motion.p>
                    <p className="text-sm md:text-base text-red-300/80 mt-2">
                      蓄势完毕，准备射精
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}

        {/* ===== 释放阶段：粒子爆发 + 白色闪光 ===== */}
        {phase === 'release' && (
          <>
            {/* 白色闪光 */}
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: flashOpacity }}
              transition={{ duration: 1.5, times: [0, 0.1, 0.4, 1] }}
            />
            {/* 粒子爆发 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                  animate={{
                    x: Math.cos(p.angle) * p.distance,
                    y: Math.sin(p.angle) * p.distance,
                    opacity: [1, 1, 0],
                    scale: [0, p.size > 8 ? 2 : 1.5, 0],
                  }}
                  transition={{
                    duration: 2 / p.speed,
                    delay: p.delay,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
            {/* 中心光环扩散 */}
            <motion.div
              className="absolute top-1/2 left-1/2 rounded-full border-4 border-white"
              style={{ width: 100, height: 100, marginLeft: -50, marginTop: -50 }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 8, 15], opacity: [1, 0.5, 0] }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 rounded-full border-2 border-neon-yellow"
              style={{ width: 100, height: 100, marginLeft: -50, marginTop: -50 }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 6, 12], opacity: [1, 0.3, 0] }}
              transition={{ duration: 2.5, delay: 0.2, ease: 'easeOut' }}
            />
            {/* 释放文字 */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)]">
                释放
              </h1>
            </motion.div>
          </>
        )}

        {/* ===== 余韵阶段：柔和光晕 + 统计预览 ===== */}
        {phase === 'afterglow' && (
          <>
            {/* 温暖光晕 */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(255,230,0,0.15) 0%, rgba(176,38,255,0.1) 40%, rgba(0,0,0,0.6) 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            />
            {/* 余韵文字 */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="text-center"
              >
                <p className="text-3xl md:text-5xl font-bold text-neon-yellow drop-shadow-[0_0_20px_rgba(255,230,0,0.6)] mb-3">
                  完美的终点
                </p>
                <p className="text-sm md:text-base text-slate-300 mb-6">
                  你坚持到了最后
                </p>
              </motion.div>

              {/* 简要统计 */}
              <motion.div
                className="flex gap-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div>
                  <div className="text-2xl font-bold font-mono text-neon-yellow">{stats.edgeCount}</div>
                  <div className="text-xs text-slate-400">寸止</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-neon-red">{stats.strokeCount}</div>
                  <div className="text-xs text-slate-400">撸动</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-neon-purple">{stats.maxCombo}</div>
                  <div className="text-xs text-slate-400">最高连击</div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}

        {/* ===== 继续按钮 ===== */}
        <AnimatePresence>
          {showButton && (
            <motion.div
              className="absolute bottom-12 inset-x-0 flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                onClick={completeClimax}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-3 rounded-xl bg-gradient-to-r from-neon-yellow to-amber-500 hover:from-amber-400 hover:to-amber-600 text-slate-900 font-bold text-lg btn-cyber transition-all shadow-[0_0_30px_rgba(255,230,0,0.4)]"
              >
                查看战绩
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
