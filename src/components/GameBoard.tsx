/**
 * 棋盘网格渲染组件
 * ========================================
 * 动态 NxN 螺旋棋盘的网格渲染。每个格子根据 TileType 显示对应配色与标签。
 * 玩家棋子叠加在棋盘上方，使用 spring 动画平滑移动。
 * 棋盘大小与地块配置从 Store 中动态读取，支持设置界面自定义。
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TILE_STYLES } from '../config/mapData'
import { useGameStore } from '../store/useGameStore'
import PlayerToken, { TILE_SIZE, TILE_GAP } from './PlayerToken'
import type { Tile } from '../types'

export default function GameBoard() {
  const playerPosition = useGameStore((s) => s.player.position)
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const tiles = useGameStore((s) => s.tiles)

  // 计算棋盘边长（根据地块的行列最大值推导）
  const size = tiles.length > 0
    ? Math.floor(Math.sqrt(tiles.length))
    : 9
  const boardSize = size * (TILE_SIZE + TILE_GAP) - TILE_GAP

  // 将地块按 row, col 排列（缓存避免每次渲染重新计算）
  const grid = useMemo<(Tile | null)[][]>(() => {
    const g: (Tile | null)[][] = Array.from({ length: size }, () =>
      Array(size).fill(null)
    )
    for (const tile of tiles) {
      if (tile.row < size && tile.col < size) {
        g[tile.row][tile.col] = tile
      }
    }
    return g
  }, [tiles, size])

  return (
    <div
      className="relative mx-auto"
      style={{ width: boardSize, height: boardSize }}
    >
      {/* 背景网格 */}
      <div
        className="absolute inset-0 rounded-2xl cyber-grid-bg border border-slate-700/50"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${size}, ${TILE_SIZE}px)`,
          gap: `${TILE_GAP}px`,
          padding: '0',
        }}
      >
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((_, col) => {
            const tile = grid[row][col]
            if (!tile) {
              return (
                <div
                  key={`empty-${row}-${col}`}
                  className="rounded-lg bg-transparent"
                  style={{ width: TILE_SIZE, height: TILE_SIZE }}
                />
              )
            }

            const style = TILE_STYLES[tile.type]
            const isCurrent = tile.index === playerPosition
            const isPassed = tile.index < playerPosition

            return (
              <motion.div
                key={`tile-${tile.index}`}
                className={`relative rounded-lg flex flex-col items-center justify-center tile-hover ${style.bg} ${style.text} ${style.border} border-2 ${
                  isCurrent ? style.glow + ' ring-2 ring-white' : ''
                } ${isPassed ? 'opacity-40' : ''}`}
                style={{ width: TILE_SIZE, height: TILE_SIZE }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: (tile.row + tile.col) * 0.02,
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
              >
                {/* 地块标签 */}
                <span className="text-xs font-bold font-mono">{style.label}</span>

                {/* 路径序号（小字） */}
                <span className="text-[8px] opacity-50 absolute top-0.5 left-1">
                  {tile.index}
                </span>

                {/* 箭头方向标识 */}
                {tile.type === 'ARROW' && tile.arrowStep !== undefined && (
                  <span className="text-[10px] absolute bottom-0.5">
                    {tile.arrowStep > 0 ? `+${tile.arrowStep}` : tile.arrowStep}
                  </span>
                )}
              </motion.div>
            )
          })
        )}
      </div>

      {/* 玩家棋子 */}
      {isGameStarted && <PlayerToken />}
    </div>
  )
}
