/**
 * 游戏设置状态管理 (Zustand)
 * ========================================
 * 在游戏开始前配置所有可调参数。
 * 设置在 initGame 时被读取，影响整局游戏。
 */

import { create } from 'zustand'

/** 各档位节拍器配置 */
interface BPMSetting {
  bpm: number
  totalBeats: number
}

/** 游戏设置接口 */
export interface GameSettings {
  // 寸止
  edgeCountdownSeconds: number

  // 节拍器
  bpmSlow: BPMSetting
  bpmMedium: BPMSetting
  bpmFast: BPMSetting

  // 地图
  boardSize: number

  // 地块权重
  tileWeights: {
    EDGE: number
    SLOW: number
    MEDIUM: number
    FAST: number
    LUBE: number
    ARROW: number
    CHANCE: number
  }

  // 道具初始数量
  initialItems: {
    ICE_CARD: number
    REROLL_CARD: number
    PRECISION_DRIVE: number
  }

  // 能量
  initialEnergy: number
  maxEnergy: number

  // 音效
  soundEnabled: boolean

  // 媒体
  mediaEnabled: boolean
  /** 媒体来源：仅自定义 / 混合 / 仅内置 */
  mediaSource: 'custom' | 'mixed' | 'builtin'

  // 撸动时媒体效果
  mediaEffect: {
    /** 启用 BPM 同步效果 */
    enabled: boolean
    /** 效果模式 */
    mode: 'pulse' | 'shake' | 'zoom' | 'rotate' | 'wave'
    /** 效果强度 1-10 */
    intensity: number
  }
}

/** 默认设置 */
function createDefaultSettings(): GameSettings {
  return {
    edgeCountdownSeconds: 30,
    bpmSlow: { bpm: 60, totalBeats: 30 },
    bpmMedium: { bpm: 100, totalBeats: 40 },
    bpmFast: { bpm: 140, totalBeats: 50 },
    boardSize: 9,
    tileWeights: {
      EDGE: 5,
      SLOW: 3,
      MEDIUM: 4,
      FAST: 3,
      LUBE: 3,
      ARROW: 3,
      CHANCE: 5,
    },
    initialItems: {
      ICE_CARD: 1,
      REROLL_CARD: 1,
      PRECISION_DRIVE: 2,
    },
    initialEnergy: 3,
    maxEnergy: 6,
    soundEnabled: true,
    mediaEnabled: true,
    mediaSource: 'custom' as const,
    mediaEffect: {
      enabled: true,
      mode: 'pulse' as const,
      intensity: 5,
    },
  }
}

interface SettingsState {
  settings: GameSettings
  /** 更新设置（部分更新） */
  updateSettings: (partial: Partial<GameSettings>) => void
  /** 重置为默认设置 */
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: createDefaultSettings(),
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
  resetSettings: () =>
    set({ settings: createDefaultSettings() }),
}))

/** 获取当前设置（非 Hook 方式，供 Store 内部调用） */
export function getSettings(): GameSettings {
  return useSettingsStore.getState().settings
}
