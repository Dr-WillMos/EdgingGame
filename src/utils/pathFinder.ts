/**
 * 螺旋路径计算器
 * ========================================
 * 为任意 NxN 矩阵生成从外圈到中心的顺时针螺旋路径索引。
 * 支持未来替换为 7x7、11x11 或自定义尺寸的地图。
 * 使用 memoize 缓存避免重复计算。
 */

/** 缓存：size -> 螺旋路径 */
const pathCache = new Map<number, Array<{ row: number; col: number }>>()

/**
 * 生成 NxN 矩阵的螺旋路径
 *
 * 路径规则：从左上角 (0,0) 出发，
 * 右 → 下 → 左 → 上，逐层向内收缩，
 * 最终到达中心格子。
 *
 * @param size 矩阵边长（必须为奇数）
 * @returns 路径上每个格子的 { row, col } 坐标数组
 */
export function generateSpiralPath(size: number): Array<{ row: number; col: number }> {
  if (size < 1 || size % 2 === 0) {
    throw new Error(`矩阵边长必须为正奇数，当前传入: ${size}`)
  }

  // 检查缓存
  const cached = pathCache.get(size)
  if (cached) return cached

  const path: Array<{ row: number; col: number }> = []
  // 四个方向：右、下、左、上
  const directions = [
    { dr: 0, dc: 1 },  // 右
    { dr: 1, dc: 0 },  // 下
    { dr: 0, dc: -1 }, // 左
    { dr: -1, dc: 0 }, // 上
  ]

  // visited 矩阵，避免重复
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  )

  let row = 0
  let col = 0
  let dirIndex = 0

  for (let i = 0; i < size * size; i++) {
    path.push({ row, col })
    visited[row][col] = true

    // 尝试沿当前方向前进
    const { dr, dc } = directions[dirIndex]
    const nextRow = row + dr
    const nextCol = col + dc

    // 如果下一个格子越界或已访问，则切换方向
    if (
      nextRow < 0 ||
      nextRow >= size ||
      nextCol < 0 ||
      nextCol >= size ||
      visited[nextRow][nextCol]
    ) {
      dirIndex = (dirIndex + 1) % 4
    }

    const newDir = directions[dirIndex]
    row += newDir.dr
    col += newDir.dc
  }

  // 写入缓存
  pathCache.set(size, path)
  return path
}

/**
 * 获取螺旋路径总长度（即格数）
 */
export function getPathLength(size: number): number {
  return size * size
}

/**
 * 根据路径序号获取矩阵坐标
 */
export function getCoordinateByIndex(
  size: number,
  index: number
): { row: number; col: number } | null {
  const path = generateSpiralPath(size)
  if (index < 0 || index >= path.length) return null
  return path[index]
}

/**
 * 根据矩阵坐标获取路径序号
 */
export function getIndexByCoordinate(
  size: number,
  row: number,
  col: number
): number {
  const path = generateSpiralPath(size)
  return path.findIndex((p) => p.row === row && p.col === col)
}
