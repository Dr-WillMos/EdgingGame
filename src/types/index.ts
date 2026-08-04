/**
 * 寸止挑战游戏 - 全局类型定义
 * ========================================
 * 所有跨模块共享的 TypeScript 类型集中声明，方便统一管理。
 */

/** 地块类型枚举 */
export type TileType =
  | 'START'    // 起点格
  | 'FINISH'   // 终点/高潮格（中心点）
  | 'EDGE'     // 寸止格：触发 30s 倒计时 + 呼吸圆环
  | 'SLOW'     // 慢速格：60 BPM 节拍器
  | 'MEDIUM'   // 中速格：100 BPM 节拍器
  | 'FAST'     // 快速格：140 BPM 节拍器
  | 'LUBE'     // 润滑格：恢复道具/视觉提示
  | 'ARROW'    // 箭头格：加速前进或后退
  | 'CHANCE';  // 命运格：随机抽卡事件

/** 单个地块的数据结构 */
export interface Tile {
  /** 路径上的序号（0 = 起点） */
  index: number;
  /** 地块类型 */
  type: TileType;
  /** 在矩阵中的行坐标（0-based） */
  row: number;
  /** 在矩阵中的列坐标（0-based） */
  col: number;
  /** 箭头格的方向：正值前进，负值后退 */
  arrowStep?: number;
}

/** 道具类型枚举 */
export type ItemType = 'ICE_CARD' | 'REROLL_CARD' | 'PRECISION_DRIVE';

/** 道具配置定义 */
export interface ItemConfig {
  type: ItemType;
  name: string;
  description: string;
  icon: string;
  /** 每局初始持有数量 */
  initialCount: number;
  /** 每局最大持有数量 */
  maxCount: number;
}

/** 命运卡片事件 */
export interface ChanceCard {
  id: string;
  title: string;
  description: string;
  /** 事件效果类型 */
  effect: ChanceEffect;
  /** 效果数值（如倒退格数、暂停轮数等） */
  value: number;
  /** 是否为正面事件 */
  isPositive: boolean;
  /** 出现权重（默认 1，数值越高出现概率越大） */
  weight?: number;
  /** 指定道具类型（用于 GAIN_ITEM 等定向获取） */
  targetItem?: ItemType;
}

/** 命运事件效果类型 */
export type ChanceEffect =
  | 'SKIP_TURN'        // 暂停一轮
  | 'EDGE_INSTANT'    // 原地寸止
  | 'BPM_INSTANT'     // 原地触发随机 BPM
  | 'EDGE_BONUS'      // 下次寸止倒计时加时
  | 'MOVE_BACK'       // 强制倒退
  | 'MOVE_FORWARD'    // 强制前进
  | 'GAIN_ITEM'       // 获得道具
  | 'LOSE_ITEM'       // 丢失道具
  | 'GAIN_ENERGY'     // 获得能量
  | 'LOSE_ENERGY'     // 失去能量
  | 'ZERO_ENERGY'     // 清空能量
  | 'CURSE_ROLL'      // 骰子诅咒（接下来N轮只能掷1-3）
  | 'DRAW_AGAIN'      // 立即再抽一张命运卡
  | 'DICE_FLOOR';     // 下轮骰子保底（最小点数）

/** 弹窗类型 */
export type ModalType =
  | 'EDGE'        // 寸止倒计时弹窗
  | 'SLOW'        // 慢速 BPM 弹窗
  | 'MEDIUM'      // 中速 BPM 弹窗
  | 'FAST'        // 快速 BPM 弹窗
  | 'CHANCE'      // 命运抽卡弹窗
  | 'LUBE'        // 润滑提示弹窗
  | 'STATS'       // 结算看板弹窗
  | 'ARROW'       // 箭头移动弹窗
  | 'CLIMAX'      // 通关高潮庆祝弹窗
  | null;         // 无弹窗

/** 游戏统计记录 */
export interface GameStats {
  /** 游戏总时长（秒） */
  totalDuration: number;
  /** 寸止总次数 */
  edgeCount: number;
  /** 撸动总次数（BPM 节拍计数总和） */
  strokeCount: number;
  /** 使用道具总数 */
  itemsUsed: number;
  /** 掷骰子总次数 */
  diceRolls: number;
  /** 遭遇命运事件次数 */
  chanceEvents: number;
  /** 连续完成寸止/BPM事件的连击数 */
  combo: number;
  /** 最高连击记录 */
  maxCombo: number;
}

/** 玩家状态 */
export interface PlayerState {
  /** 当前路径序号 */
  position: number;
  /** 持有道具列表 */
  items: Record<ItemType, number>;
  /** 剩余能量值 */
  energy: number;
  /** 最大能量值 */
  maxEnergy: number;
  /** 是否跳过下一轮 */
  skipNextTurn: boolean;
  /** 骰子诅咒剩余轮数（每轮最大掷出3点） */
  curseRoundsRemaining: number;
  /** 下轮骰子保底最小点数（0=无保底） */
  diceFloor: number;
}

/** 游戏阶段 */
export type GamePhase = 'IDLE' | 'ROLLING' | 'MOVING' | 'EVENT' | 'FINISHED';

/** BPM 节拍器配置 */
export interface BPMConfig {
  bpm: number;
  label: string;
  totalBeats: number;
  color: string;
}

/** 寸止称号定义 */
export interface TitleConfig {
  title: string;
  description: string;
  /** 触发条件（基于统计数据的阈值判断） */
  condition: (stats: { edgeCount: number }) => boolean;
}

/** 媒体文件类型 */
export type MediaType = 'image' | 'video'

/** 单个媒体素材定义 */
export interface MediaItem {
  /** 文件路径（相对于 public 目录） */
  src: string
  /** 媒体类型 */
  type: MediaType
  /** 视频时长（秒），可选 */
  duration?: number
}
