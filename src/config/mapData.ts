/**
 * 地图数据配置
 * ========================================
 * 9x9 螺旋棋盘配置矩阵与地块类型定义。
 * 通过 pathFinder 生成螺旋路径，再按权重分配地块类型。
 * 未来可轻松替换为 7x7、11x11 或自定义地图。
 */

import type { Tile, TileType } from '../types'
import { generateSpiralPath } from '../utils/pathFinder'

/** 棋盘边长（必须为奇数） */
export const BOARD_SIZE = 9

/** 路径总格数 */
export const PATH_LENGTH = BOARD_SIZE * BOARD_SIZE // 81

/**
 * 地块类型配色方案
 * 每种地块对应 Tailwind CSS 类名，便于统一渲染
 */
export const TILE_STYLES: Record<
  TileType,
  { bg: string; text: string; border: string; label: string; glow: string }
> = {
  START: {
    bg: 'bg-emerald-600',
    text: 'text-white',
    border: 'border-emerald-400',
    label: '起',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]',
  },
  FINISH: {
    bg: 'bg-amber-500',
    text: 'text-black',
    border: 'border-amber-300',
    label: '终',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.8)]',
  },
  EDGE: {
    bg: 'bg-yellow-400',
    text: 'text-black',
    border: 'border-yellow-200',
    label: '寸',
    glow: 'shadow-[0_0_12px_rgba(255,230,0,0.5)]',
  },
  SLOW: {
    bg: 'bg-blue-900',
    text: 'text-white',
    border: 'border-blue-600',
    label: '慢',
    glow: 'shadow-[0_0_12px_rgba(30,58,138,0.5)]',
  },
  MEDIUM: {
    bg: 'bg-cyan-700',
    text: 'text-white',
    border: 'border-cyan-400',
    label: '中',
    glow: 'shadow-[0_0_12px_rgba(34,211,238,0.5)]',
  },
  FAST: {
    bg: 'bg-sky-400',
    text: 'text-black',
    border: 'border-sky-200',
    label: '快',
    glow: 'shadow-[0_0_12px_rgba(56,189,248,0.5)]',
  },
  LUBE: {
    bg: 'bg-white',
    text: 'text-red-600',
    border: 'border-red-300',
    label: '润',
    glow: 'shadow-[0_0_12px_rgba(255,0,85,0.3)]',
  },
  ARROW: {
    bg: 'bg-orange-600',
    text: 'text-white',
    border: 'border-orange-400',
    label: '箭',
    glow: 'shadow-[0_0_12px_rgba(234,88,12,0.5)]',
  },
  CHANCE: {
    bg: 'bg-purple-700',
    text: 'text-white',
    border: 'border-purple-400',
    label: '运',
    glow: 'shadow-[0_0_12px_rgba(176,38,255,0.5)]',
  },
}

/**
 * 确定性伪随机数生成器（基于种子）
 * 确保同一配置下地图布局一致，便于调试与平衡性测试
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * 地块权重分布表（默认值）
 * 数值越高，该地块出现概率越大
 */
const DEFAULT_TILE_WEIGHTS: Record<TileType, number> = {
  EDGE: 5,
  SLOW: 3,
  MEDIUM: 4,
  FAST: 3,
  LUBE: 3,
  ARROW: 3,
  CHANCE: 5,
  START: 0,
  FINISH: 0,
}

/**
 * 根据权重随机抽取地块类型
 * @param seed 随机种子
 * @param weights 自定义权重表
 */
function pickTileType(seed: number, weights: Record<TileType, number>): TileType {
  const types: TileType[] = ['EDGE', 'SLOW', 'MEDIUM', 'FAST', 'LUBE', 'ARROW', 'CHANCE']
  const totalWeight = types.reduce((sum, t) => sum + (weights[t] ?? 0), 0)
  if (totalWeight === 0) return 'LUBE'

  const rand = seededRandom(seed) * totalWeight
  let accumulator = 0
  for (const type of types) {
    accumulator += weights[type] ?? 0
    if (rand < accumulator) return type
  }
  return 'LUBE' // 兜底
}

/**
 * 生成完整地图地块配置
 *
 * 策略：
 * - 起点（index 0）= START
 * - 终点（最后 index）= FINISH
 * - 其余按权重随机分配，但保证不连续出现相同类型超过 2 次
 * - 每 7 格强制插入一个 CHANCE 格，确保命运事件频率
 *
 * @param size 棋盘边长
 * @param weights 自定义权重表
 */
export function generateGameTiles(
  size: number = BOARD_SIZE,
  weights: Record<TileType, number> = DEFAULT_TILE_WEIGHTS
): Tile[] {
  const spiralPath = generateSpiralPath(size)
  const tiles: Tile[] = []

  for (let i = 0; i < spiralPath.length; i++) {
    const { row, col } = spiralPath[i]
    let type: TileType

    if (i === 0) {
      type = 'START'
    } else if (i === spiralPath.length - 1) {
      type = 'FINISH'
    } else if (i % 7 === 0) {
      // 每 7 格固定出现一个命运格
      type = 'CHANCE'
    } else {
      type = pickTileType(i * 3.7 + 1.3, weights)
      // 防止连续 3 次相同类型
      let consecutiveCount = 1
      for (let j = i - 1; j >= Math.max(1, i - 2); j--) {
        if (tiles[j]?.type === type) {
          consecutiveCount++
        } else {
          break
        }
      }
      if (consecutiveCount >= 3) {
        // 重新抽取
        type = pickTileType(i * 7.1 + 5.3, weights)
      }
    }

    const tile: Tile = {
      index: i,
      type,
      row,
      col,
    }

    // 箭头格随机方向：前进 1~3 格 或 后退 1~2 格
    if (type === 'ARROW') {
      const isForward = seededRandom(i * 9.1) > 0.35
      tile.arrowStep = isForward
        ? Math.floor(seededRandom(i * 3.3) * 3) + 1  // +1~+3
        : -(Math.floor(seededRandom(i * 5.7) * 2) + 1) // -1~-2
    }

    tiles.push(tile)
  }

  return tiles
}

/** 默认地块配置（使用默认 9x9 + 默认权重） */
export const TILES: Tile[] = generateGameTiles()

/**
 * 动态生成地块配置（供设置中使用自定义尺寸与权重时调用）
 * @param size 棋盘边长
 * @param weights 权重表（TileType -> number）
 */
export function generateTilesWithSettings(
  size: number,
  weights: Partial<Record<TileType, number>>
): Tile[] {
  const fullWeights: Record<TileType, number> = {
    ...DEFAULT_TILE_WEIGHTS,
    ...weights,
  }
  return generateGameTiles(size, fullWeights)
}

/**
 * 根据矩阵坐标获取地块（支持传入自定义 tiles 数组，默认使用静态 TILES）
 */
export function getTileByCoordinate(row: number, col: number, tiles: Tile[] = TILES): Tile | undefined {
  return tiles.find((t) => t.row === row && t.col === col)
}

/**
 * 根据路径序号获取地块（支持传入自定义 tiles 数组，默认使用静态 TILES）
 */
export function getTileByIndex(index: number, tiles: Tile[] = TILES): Tile | undefined {
  return tiles.find((t) => t.index === index)
}

/**
 * 寸止倒计时配置（可调整）
 */
export const EDGE_COUNTDOWN_SECONDS = 30

/**
 * BPM 节拍器配置
 */
export const BPM_CONFIG = {
  SLOW: { bpm: 60, label: '慢速节拍', totalBeats: 30, color: '#3B82F6' },
  MEDIUM: { bpm: 100, label: '中速节拍', totalBeats: 40, color: '#22D3EE' },
  FAST: { bpm: 140, label: '快速节拍', totalBeats: 50, color: '#38BDF8' },
} as const
