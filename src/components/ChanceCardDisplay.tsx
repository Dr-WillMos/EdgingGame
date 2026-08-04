/**
 * 命运卡片展示组件
 * ========================================
 * 命运格触发时显示的随机抽卡动画。
 * 卡片翻转动画展示效果，点击「接受命运」应用效果。
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Check } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

export default function ChanceCardDisplay() {
  const activeChanceCard = useGameStore((s) => s.activeChanceCard)
  const applyChanceCard = useGameStore((s) => s.applyChanceCard)
  const [isFlipped, setIsFlipped] = useState(false)

  // 每次新卡片触发时重置翻转状态
  useEffect(() => {
    setIsFlipped(false)
  }, [activeChanceCard?.id])

  if (!activeChanceCard) return null

  const isPositive = activeChanceCard.isPositive
  const accentColor = isPositive ? 'neon-green' : 'neon-red'
  const borderColor = isPositive ? 'border-green-500' : 'border-red-500'
  const glowClass = isPositive
    ? 'shadow-[0_0_30px_rgba(57,255,20,0.4)]'
    : 'shadow-[0_0_30px_rgba(255,0,85,0.4)]'

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Sparkles className={`w-5 h-5 text-${accentColor}`} />
        <h3 className="text-xl font-bold text-neon-purple neon-text-purple">命运抽卡</h3>
        <Sparkles className={`w-5 h-5 text-${accentColor}`} />
      </div>

      {/* 卡片翻转区域 */}
      <div
        className="relative w-72 h-96 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* 卡片背面（未翻转） */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-800 to-purple-950 border-2 border-purple-500 shadow-[0_0_20px_rgba(176,38,255,0.5)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                ❓
              </motion.div>
              <p className="text-purple-200 text-sm">点击翻牌</p>
            </div>
          </div>

          {/* 卡片正面（翻转后） */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br ${isPositive ? 'from-green-900 to-slate-900' : 'from-red-950 to-slate-900'} border-2 ${borderColor} ${glowClass}`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* 效果标签 */}
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isPositive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {isPositive ? '★ 好运' : '⚠ 惩罚'}
            </div>

            {/* 卡片图标 */}
            <div className="text-5xl">
              {isPositive ? '✨' : '💀'}
            </div>

            {/* 卡片标题 */}
            <h4 className={`text-2xl font-bold text-center px-4 ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
              {activeChanceCard.title}
            </h4>

            {/* 卡片描述 */}
            <p className="text-slate-300 text-sm text-center px-6">
              {activeChanceCard.description}
            </p>
          </div>
        </motion.div>
      </div>

      {/* 操作按钮 */}
      {isFlipped ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={applyChanceCard}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white btn-cyber ${
            isPositive
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
          } shadow-lg`}
        >
          <Check className="w-5 h-5" />
          接受命运
        </motion.button>
      ) : (
        <p className="text-slate-400 text-sm">点击卡片查看命运</p>
      )}
    </div>
  )
}
