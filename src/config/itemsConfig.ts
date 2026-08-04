/**
 * 道具与事件配置
 * ========================================
 * 定义所有道具、命运卡片、称号等可扩展数据。
 * 新增道具或事件只需在此文件中添加配置即可，无需改动核心逻辑。
 */

import type { ItemConfig, ItemType, ChanceCard, TitleConfig } from '../types'

/**
 * 道具配置表
 */
export const ITEMS_CONFIG: Record<ItemType, ItemConfig> = {
  ICE_CARD: {
    type: 'ICE_CARD',
    name: '冷静卡',
    description: '直接免除当前格子的任务要求，跳过本轮。',
    icon: '🛡️',
    initialCount: 1,
    maxCount: 3,
  },
  REROLL_CARD: {
    type: 'REROLL_CARD',
    name: '重掷卡',
    description: '对当前骰子点数不满意时重新掷一次。',
    icon: '🎲',
    initialCount: 1,
    maxCount: 3,
  },
  PRECISION_DRIVE: {
    type: 'PRECISION_DRIVE',
    name: '精准控制',
    description: '消耗 1 点能量，允许自选 1~3 步前进。',
    icon: '🎯',
    initialCount: 2,
    maxCount: 5,
  },
}

/** 所有道具类型的有序列表 */
export const ALL_ITEM_TYPES: ItemType[] = ['ICE_CARD', 'REROLL_CARD', 'PRECISION_DRIVE']

/**
 * 命运卡片池
 * 踩中命运格时从此池中随机抽取一张
 */
export const CHANCE_CARDS: ChanceCard[] = [
  {
    id: 'edge_instant_20',
    title: '原地寸止',
    description: '命运之手按下了暂停键，原地寸止 20 秒。',
    effect: 'EDGE_INSTANT',
    value: 20,
    isPositive: false,
    weight: 2,
  },
  {
    id: 'bpm_instant',
    title: '原地开冲',
    description: '命运突变！原地触发一次随机 BPM 事件。',
    effect: 'BPM_INSTANT',
    value: 1,
    isPositive: false,
    weight: 2,
  },
  {
    id: 'edge_bonus_15',
    title: '寸止加时',
    description: '下次寸止倒计时强制 +15 秒。',
    effect: 'EDGE_BONUS',
    value: 15,
    isPositive: false,
    weight: 2,
  },
  {
    id: 'lose_item',
    title: '道具丢失',
    description: '背包被窃！随机丢失一张已持有的道具卡。',
    effect: 'LOSE_ITEM',
    value: 1,
    isPositive: false,
    weight: 2,
  },
  {
    id: 'zero_energy',
    title: '能量枯竭',
    description: '系统过载，全部能量瞬间清零！',
    effect: 'ZERO_ENERGY',
    value: 0,
    isPositive: false,
    weight: 1,
  },
  {
    id: 'curse_roll',
    title: '骰子诅咒',
    description: '厄运缠身，接下来 2 轮只能掷出 1~3 点。',
    effect: 'CURSE_ROLL',
    value: 2,
    isPositive: false,
    weight: 2,
  },
  {
    id: 'move_back_3',
    title: '倒退三格',
    description: '时空扭曲！强制倒退 3 格。',
    effect: 'MOVE_BACK',
    value: 3,
    isPositive: false,
    weight: 2,
  },
  {
    id: 'move_back_5',
    title: '深度回溯',
    description: '严重失控，强制倒退 5 格！',
    effect: 'MOVE_BACK',
    value: 5,
    isPositive: false,
    weight: 1,
  },
  {
    id: 'move_forward_2',
    title: '顺风推进',
    description: '状态不错，直接前进 2 格！',
    effect: 'MOVE_FORWARD',
    value: 2,
    isPositive: true,
    weight: 2,
  },
  {
    id: 'move_forward_4',
    title: '极速冲刺',
    description: '超频运转，前进 4 格！',
    effect: 'MOVE_FORWARD',
    value: 4,
    isPositive: true,
    weight: 1,
  },
  {
    id: 'gain_ice_card',
    title: '冷静补给',
    description: '获得一张冷静卡 🛡️',
    effect: 'GAIN_ITEM',
    value: 1,
    isPositive: true,
    weight: 2,
  },
  {
    id: 'gain_reroll_card',
    title: '骰运降临',
    description: '获得一张重掷卡 🎲',
    effect: 'GAIN_ITEM',
    value: 1,
    isPositive: true,
    weight: 2,
  },
  {
    id: 'gain_energy_2',
    title: '能量充盈',
    description: '恢复 2 点能量 ⚡',
    effect: 'GAIN_ENERGY',
    value: 2,
    isPositive: true,
    weight: 2,
  },
  {
    id: 'gain_energy_3',
    title: '满电状态',
    description: '恢复 3 点能量 ⚡⚡⚡',
    effect: 'GAIN_ENERGY',
    value: 3,
    isPositive: true,
    weight: 1,
  },
  {
    id: 'move_forward_6',
    title: '疾风步',
    description: '风驰电掣，直接前进 6 格！',
    effect: 'MOVE_FORWARD',
    value: 6,
    isPositive: true,
    weight: 1,
  },
  {
    id: 'gain_energy_full',
    title: '能量满载',
    description: '系统过载充能，能量直接回满！',
    effect: 'GAIN_ENERGY',
    value: 6,
    isPositive: true,
    weight: 2,
  },
  {
    id: 'gain_ice_card_x2',
    title: '冷静大师',
    description: '获得 2 张冷静卡 🛡️🛡️',
    effect: 'GAIN_ITEM',
    value: 2,
    targetItem: 'ICE_CARD',
    isPositive: true,
    weight: 1,
  },
  {
    id: 'draw_again',
    title: '幸运再抽',
    description: '命运眷顾！立即再抽一张命运卡。',
    effect: 'DRAW_AGAIN',
    value: 1,
    isPositive: true,
    weight: 1,
  },
  {
    id: 'dice_floor_4',
    title: '神之骰子',
    description: '骰子被祝福，下轮保底 4 点！',
    effect: 'DICE_FLOOR',
    value: 4,
    isPositive: true,
    weight: 2,
  },
  {
    id: 'lose_energy_1',
    title: '能量泄漏',
    description: '系统过载，失去 1 点能量。',
    effect: 'LOSE_ENERGY',
    value: 1,
    isPositive: false,
    weight: 2,
  },
  {
    id: 'gain_precision',
    title: '精准模组',
    description: '获得一张精准控制卡 🎯',
    effect: 'GAIN_ITEM',
    value: 1,
    isPositive: true,
    weight: 1,
  },
]

/**
 * 随机抽取一张命运卡片（按权重分配概率）
 */
export function drawRandomChanceCard(): ChanceCard {
  const totalWeight = CHANCE_CARDS.reduce((sum, card) => sum + (card.weight ?? 1), 0)
  const rand = Math.random() * totalWeight
  let accumulator = 0
  for (const card of CHANCE_CARDS) {
    accumulator += card.weight ?? 1
    if (rand < accumulator) return card
  }
  return CHANCE_CARDS[CHANCE_CARDS.length - 1]
}

/**
 * 获取道具卡对应的命运卡片（用于 GAIN_ITEM 事件）
 */
export function getItemChanceCard(itemType: ItemType): ChanceCard {
  const cardIdMap: Record<ItemType, string> = {
    ICE_CARD: 'gain_ice_card',
    REROLL_CARD: 'gain_reroll_card',
    PRECISION_DRIVE: 'gain_precision',
  }
  const cardId = cardIdMap[itemType]
  return CHANCE_CARDS.find((c) => c.id === cardId) ?? CHANCE_CARDS[0]
}

/**
 * 玩家能量配置
 */
export const ENERGY_CONFIG = {
  initial: 3,
  max: 6,
}

/**
 * 通关称号配置表
 * 根据通关时的统计数据判定，取第一个满足条件的称号
 */
export const TITLES: TitleConfig[] = [
  {
    title: '秒杀级选手',
    description: '寸止次数为 0，全程零失误直接通关。',
    condition: (stats) => stats.edgeCount === 0,
  },
  {
    title: '绝对掌控者',
    description: '寸止次数不超过 5 次，完美控制节奏。',
    condition: (stats) => stats.edgeCount > 0 && stats.edgeCount <= 5,
  },
  {
    title: '寸止界魔导师',
    description: '寸止次数 6~12 次，在极限边缘游刃有余。',
    condition: (stats) => stats.edgeCount > 5 && stats.edgeCount <= 12,
  },
  {
    title: '极限修行者',
    description: '寸止次数超过 12 次，百折不挠的意志。',
    condition: (stats) => stats.edgeCount > 12,
  },
]

/**
 * 根据统计数据获取称号
 */
export function getTitleByStats(stats: { edgeCount: number }): TitleConfig {
  return TITLES.find((t) => t.condition(stats)) ?? TITLES[TITLES.length - 1]
}
