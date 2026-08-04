/**
 * 骰子组件
 * ========================================
 * 3D 旋转骰子，支持滚动动画与数字快速滚动效果。
 * 使用 Framer Motion 实现 3D 翻转动画。
 */

import { motion } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'

/** 骰子点数对应的点位图（3x3 网格） */
const DICE_PATTERNS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

export default function Dice() {
  const diceValue = useGameStore((s) => s.diceValue)
  const diceRolling = useGameStore((s) => s.diceRolling)

  // 滚动时快速显示随机数字
  const displayValue = diceRolling
    ? Math.floor(Math.random() * 6) + 1
    : diceValue ?? 1

  const dots = DICE_PATTERNS[displayValue] || [4]

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-neon-blue shadow-[0_0_20px_rgba(0,240,255,0.4)]"
        animate={
          diceRolling
            ? {
                rotateX: [0, 360, 720],
                rotateY: [0, 360, 720],
                scale: [1, 1.1, 1],
              }
            : {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
              }
        }
        transition={{
          duration: diceRolling ? 0.6 : 0.3,
          repeat: diceRolling ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* 3x3 点位网格 */}
        <div className="grid grid-cols-3 gap-1 p-3 w-full h-full">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                dots.includes(i)
                  ? 'bg-neon-blue shadow-[0_0_6px_rgba(0,240,255,0.8)]'
                  : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* 骰子数值文字 */}
      <motion.div
        key={displayValue}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-neon-blue neon-text-blue font-mono"
      >
        {diceRolling ? '?' : diceValue ?? '—'}
      </motion.div>
    </div>
  )
}
