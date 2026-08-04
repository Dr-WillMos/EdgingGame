/**
 * 游戏结算/战绩看板组件
 * ========================================
 * 通关后弹出的结算面板，包含：
 * - Framer Motion 烟花/粒子特效
 * - 玩家专属"性致称号"
 * - 完整数据统计
 * - 重新开始按钮
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, RotateCcw, Clock, Shield, Activity, Dices, Sparkles, Package, Zap } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import type { GameStats } from '../types'

/** 生成烟花粒子 */
function Fireworks() {
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    angle: (i / 40) * Math.PI * 2,
    distance: 100 + Math.random() * 150,
    delay: Math.random() * 0.5,
    color: ['#FFE600', '#00F0FF', '#FF0055', '#B026FF', '#39FF14'][i % 5],
    size: 4 + Math.random() * 8,
  }))

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: [1, 1, 0],
            scale: [1, 1.5, 0],
          }}
          transition={{
            duration: 2,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      ))}
    </div>
  )
}

/** 统计数据行 */
function StatRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800/60">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-bold font-mono text-white">{value}</span>
    </div>
  )
}

/** 格式化时长 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export default function StatsModal() {
  const activeModal = useGameStore((s) => s.activeModal)
  const stats = useGameStore((s) => s.stats)
  const finalTitle = useGameStore((s) => s.finalTitle)
  const finalDescription = useGameStore((s) => s.finalDescription)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <AnimatePresence>
      {activeModal === 'STATS' && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 烟花特效 */}
          <Fireworks />

          <motion.div
            className="relative w-full max-w-md glass-card rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden"
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          >
            {/* 顶部光效条 */}
            <div className="h-1.5 bg-gradient-to-r from-neon-yellow via-neon-red to-neon-purple" />

            <div className="p-6">
              {/* 胜利图标 */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="flex justify-center mb-4"
              >
                <div className="relative">
                  <Trophy className="w-16 h-16 text-neon-yellow" />
                  <motion.div
                    className="absolute inset-0 blur-xl"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Trophy className="w-16 h-16 text-neon-yellow" />
                  </motion.div>
                </div>
              </motion.div>

              {/* 标题 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <h2 className="text-2xl font-bold text-neon-yellow neon-text-yellow mb-1">
                  通关达成！
                </h2>
                <p className="text-slate-400 text-xs">恭喜完成寸止挑战</p>
              </motion.div>

              {/* 称号卡片 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-purple-900/60 to-slate-800/60 border border-purple-500/40 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-neon-purple" />
                  <span className="text-xs text-purple-300">专属称号</span>
                </div>
                <h3 className="text-xl font-bold text-neon-purple neon-text-purple mb-1">
                  {finalTitle}
                </h3>
                <p className="text-xs text-slate-400">{finalDescription}</p>
              </motion.div>

              {/* 数据统计 */}
              <div className="space-y-2 mb-6">
                <StatRow icon={Clock} label="游戏总时长" value={formatDuration(stats.totalDuration)} color="text-neon-blue" />
                <StatRow icon={Shield} label="寸止总次数" value={stats.edgeCount} color="text-neon-yellow" />
                <StatRow icon={Activity} label="撸动总次数" value={stats.strokeCount} color="text-neon-red" />
                <StatRow icon={Dices} label="掷骰子次数" value={stats.diceRolls} color="text-neon-blue" />
                <StatRow icon={Sparkles} label="命运事件次数" value={stats.chanceEvents} color="text-neon-purple" />
                <StatRow icon={Package} label="使用道具数" value={stats.itemsUsed} color="text-neon-green" />
                <StatRow icon={Zap} label="最高连击" value={stats.maxCombo} color="text-orange-400" />
              </div>

              {/* 重新开始按钮 */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={resetGame}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold btn-cyber transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                再来一局
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
