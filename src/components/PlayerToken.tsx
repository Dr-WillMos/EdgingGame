/**
 * 玩家棋子组件
 * ========================================
 * 在棋盘上渲染玩家棋子，使用 Framer Motion spring 动画
 * 实现平滑的逐格移动效果。
 * 棋子位置从 Store 的动态 tiles 数组中读取。
 */

import { motion } from 'framer-motion'
import { useGameStore } from '../store/useGameStore'

/** 每个格子的尺寸（px），需与 GameBoard 中的 tile 尺寸一致 */
export const TILE_SIZE = 44
/** 格子间距（px） */
export const TILE_GAP = 4

export default function PlayerToken() {
  const playerPosition = useGameStore((s) => s.player.position)
  const isMoving = useGameStore((s) => s.isMoving)
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const tiles = useGameStore((s) => s.tiles)

  const safePos = Math.max(0, Math.min(tiles.length - 1, playerPosition))
  const tile = tiles[safePos]
  if (!tile) return null

  // 计算棋子在棋盘中的绝对坐标
  const x = tile.col * (TILE_SIZE + TILE_GAP)
  const y = tile.row * (TILE_SIZE + TILE_GAP)

  if (!isGameStarted) return null

  return (
    <motion.div
      className="absolute z-50 flex items-center justify-center pointer-events-none"
      initial={{ x, y, scale: 0 }}
      animate={{
        x,
        y,
        scale: isMoving ? 1.15 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.8,
      }}
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
      }}
    >
      {/* 棋子发光圆环 */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={{
          boxShadow: isMoving
            ? '0 0 20px rgba(0, 240, 255, 0.9), 0 0 40px rgba(0, 240, 255, 0.5)'
            : '0 0 12px rgba(0, 240, 255, 0.6)',
        }}
        transition={{ duration: 0.3 }}
      />
      {/* 棋子主体 */}
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-cyan-600 border-2 border-white shadow-lg">
        <span className="text-sm font-bold text-slate-900">★</span>
      </div>
    </motion.div>
  )
}
