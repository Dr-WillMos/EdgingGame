/**
 * 道具/技能栏组件
 * ========================================
 * 玩家面板的道具栏与能量条。
 * 展示持有道具数量，支持点击使用。
 * 道具可用状态根据游戏阶段动态判定。
 */

import { motion } from 'framer-motion'
import { Shield, RefreshCw, Target, Zap } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { ITEMS_CONFIG, ALL_ITEM_TYPES } from '../config/itemsConfig'
import type { ItemType } from '../types'

/** 道具图标映射 */
const ITEM_ICONS: Record<ItemType, typeof Shield> = {
  ICE_CARD: Shield,
  REROLL_CARD: RefreshCw,
  PRECISION_DRIVE: Target,
}

export default function Inventory() {
  const items = useGameStore((s) => s.player.items)
  const energy = useGameStore((s) => s.player.energy)
  const maxEnergy = useGameStore((s) => s.player.maxEnergy)
  const gamePhase = useGameStore((s) => s.gamePhase)
  const activeModal = useGameStore((s) => s.activeModal)
  const diceValue = useGameStore((s) => s.diceValue)
  const diceRolling = useGameStore((s) => s.diceRolling)
  const useItem = useGameStore((s) => s.useItem)

  /** 判断道具是否可用 */
  const canUse = (type: ItemType): boolean => {
    if (items[type] <= 0) return false

    switch (type) {
      case 'ICE_CARD':
        // 仅在事件弹窗激活时可用
        return gamePhase === 'EVENT' && activeModal !== null
      case 'REROLL_CARD':
        // 仅在骰子已掷但未移动时可用
        return (
          (gamePhase === 'ROLLING' && !diceRolling && diceValue !== null) ||
          (gamePhase === 'IDLE' && diceValue !== null)
        )
      case 'PRECISION_DRIVE':
        // 仅在空闲且有能量时可用
        return gamePhase === 'IDLE' && energy > 0
      default:
        return false
    }
  }

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      {/* 能量条 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-neon-yellow" />
            <span className="text-sm font-bold text-slate-300">能量</span>
          </div>
          <span className="text-xs font-mono text-neon-yellow">
            {energy} / {maxEnergy}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxEnergy }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 h-2 rounded-full"
              animate={{
                backgroundColor: i < energy ? '#FFE600' : '#334155',
                boxShadow: i < energy ? '0 0 6px rgba(255,230,0,0.5)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* 道具栏 */}
      <div>
        <div className="text-sm font-bold text-slate-300 mb-2">道具栏</div>
        <div className="grid grid-cols-3 gap-3">
          {ALL_ITEM_TYPES.map((type) => {
            const config = ITEMS_CONFIG[type]
            const Icon = ITEM_ICONS[type]
            const count = items[type]
            const usable = canUse(type)

            return (
              <motion.button
                key={type}
                onClick={() => usable && useItem(type)}
                disabled={!usable}
                whileHover={usable ? { scale: 1.05 } : undefined}
                whileTap={usable ? { scale: 0.95 } : undefined}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  usable
                    ? 'border-neon-blue/50 bg-slate-700/80 hover:bg-slate-600/80 cursor-pointer'
                    : 'border-slate-700 bg-slate-800/50 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* 道具图标 */}
                <Icon
                  className={`w-6 h-6 ${usable ? 'text-neon-blue' : 'text-slate-500'}`}
                />
                {/* 道具名称 */}
                <span className="text-xs text-slate-300 text-center leading-tight">
                  {config.name}
                </span>
                {/* 数量 */}
                <span
                  className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    count > 0 ? 'bg-neon-blue text-slate-900' : 'bg-slate-600 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* 道具说明 */}
      <div className="text-xs text-slate-500 leading-relaxed">
        {ALL_ITEM_TYPES.map((type) => (
          <div key={type} className="mb-1">
            <span className="text-slate-400">{ITEMS_CONFIG[type].icon} {ITEMS_CONFIG[type].name}：</span>
            {ITEMS_CONFIG[type].description}
          </div>
        ))}
      </div>
    </div>
  )
}
