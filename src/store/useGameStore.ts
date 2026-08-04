/**
 * 游戏核心状态管理 (Zustand)
 * ========================================
 * 统一管理游戏状态、玩家位置、背包道具、游戏统计。
 * 所有状态变更通过 actions 触发，保证状态可追踪。
 * 包含逐格移动动画控制与地块事件触发逻辑。
 */

import { create } from 'zustand'
import type {
  GamePhase,
  GameStats,
  ItemType,
  ModalType,
  ChanceCard,
  PlayerState,
  ChanceEffect,
  MediaItem,
  Tile,
} from '../types'
import {
  TILES,
  EDGE_COUNTDOWN_SECONDS,
  BPM_CONFIG,
  PATH_LENGTH,
  generateTilesWithSettings,
} from '../config/mapData'
import {
  ITEMS_CONFIG,
  drawRandomChanceCard,
  getTitleByStats,
} from '../config/itemsConfig'
import { soundEngine } from '../utils/soundEngine'
import { drawRandomMedia, drawClimaxMedia } from '../config/mediaConfig'
import { getSettings } from './useSettingsStore'

/** 每格移动间隔（毫秒） */
const MOVE_INTERVAL_MS = 300

/** 安全抽取媒体：库为空时返回 null 而非抛错 */
function safeDrawMedia(enabled: boolean): MediaItem | null {
  if (!enabled) return null
  try {
    return drawRandomMedia()
  } catch (e) {
    console.warn('[useGameStore] safeDrawMedia:', e)
    return null
  }
}

/** 当前移动动画 timer（用于互斥，防止并发移动） */
let moveAnimTimer: ReturnType<typeof setTimeout> | null = null

/** 清理移动动画 timer */
function clearMoveAnimTimer() {
  if (moveAnimTimer !== null) {
    clearTimeout(moveAnimTimer)
    moveAnimTimer = null
  }
}

/** 游戏级别的延迟 timer 追踪（ARROW / REROLL 等），重置游戏时统一清理 */
const gameTimers: ReturnType<typeof setTimeout>[] = []

function registerGameTimer(timer: ReturnType<typeof setTimeout>) {
  gameTimers.push(timer)
}

function clearAllGameTimers() {
  for (const timer of gameTimers) {
    clearTimeout(timer)
  }
  gameTimers.length = 0
}

/** 游戏全局状态接口 */
interface GameState {
  // ===== 基础状态 =====
  gamePhase: GamePhase
  activeModal: ModalType
  isGameStarted: boolean

  // ===== 玩家状态 =====
  player: PlayerState

  // ===== 骰子状态 =====
  diceValue: number | null
  diceRolling: boolean
  /** 精准控制模式：允许玩家自选步数 */
  precisionMode: boolean

  // ===== 移动状态 =====
  isMoving: boolean

  // ===== 事件状态 =====
  activeChanceCard: ChanceCard | null
  edgeCountdown: number
  /** 下次寸止倒计时额外增加的秒数 */
  nextEdgeBonus: number
  bpmBeatCount: number
  bpmTotalBeats: number
  bpmLabel: string

  // ===== 媒体状态 =====
  currentMedia: MediaItem | null

  // ===== 动态地图 =====
  tiles: Tile[]
  pathLength: number

  // ===== 统计 =====
  stats: GameStats
  gameStartTime: number

  // ===== 结算 =====
  finalTitle: string
  finalDescription: string

  // ===== Actions =====
  initGame: () => void
  rollDice: () => void
  /** 确认骰子结果后开始逐格移动 */
  confirmMove: () => void
  /** 触发当前地块事件 */
  triggerTileEvent: () => void
  /** 关闭当前弹窗 */
  closeModal: () => void
  /** 寸止倒计时完成 */
  completeEdgeCountdown: () => void
  /** BPM 节拍增加 */
  addBPMBeat: () => void
  /** BPM 完成 */
  completeBPM: () => void
  /** 使用道具 */
  useItem: (type: ItemType) => void
  /** 精准控制选择步数 */
  usePrecisionDrive: (steps: number) => void
  /** 应用命运卡片效果 */
  applyChanceCard: () => void
  /** 通关高潮场景完成，进入战绩面板 */
  completeClimax: () => void
  /** 重置游戏 */
  resetGame: () => void
  /** 获取当前地块类型 */
  getCurrentTileType: () => string
  /** 检查是否有存档 */
  hasSavedGame: () => boolean
  /** 加载存档 */
  loadSavedGame: () => void
  /** 清除存档 */
  clearSave: () => void
}

/** localStorage 存档 key */
const SAVE_KEY = 'edging_challenge_save'
/** 存档格式版本号，用于兼容性校验 */
const SAVE_VERSION = 1

/** localStorage 是否可用（某些隐私模式下会被禁用） */
function isLocalStorageAvailable(): boolean {
  try {
    const key = '__ls_test__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** 需要持久化的状态子集 */
interface SaveData {
  version: number
  player: PlayerState
  stats: GameStats
  tiles: Tile[]
  pathLength: number
  gameStartTime: number
}

/** 保存游戏状态到 localStorage */
function saveToLocalStorage(state: GameState) {
  if (!isLocalStorageAvailable()) return
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      player: state.player,
      stats: state.stats,
      tiles: state.tiles,
      pathLength: state.pathLength,
      gameStartTime: state.gameStartTime,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    // 区分配额超限与其他错误
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.warn('[save] 本地存储空间不足，存档失败')
    } else {
      console.warn('[save] 存档失败:', e)
    }
  }
}

/** 从 localStorage 读取存档 */
function loadFromLocalStorage(): SaveData | null {
  if (!isLocalStorageAvailable()) return null
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (!validateSaveData(data)) return null
    return data
  } catch (e) {
    console.warn('[load] 读档失败:', e)
    return null
  }
}

/** 校验存档数据结构完整性 */
function validateSaveData(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  // 版本兼容性检查
  if (typeof d.version !== 'number' || d.version !== SAVE_VERSION) return false
  if (!d.player || typeof d.player !== 'object') return false
  if (!d.stats || typeof d.stats !== 'object') return false
  if (!Array.isArray(d.tiles)) return false
  if (typeof d.pathLength !== 'number' || d.pathLength <= 0) return false
  if (typeof d.gameStartTime !== 'number' || d.gameStartTime <= 0) return false
  const p = d.player as Record<string, unknown>
  if (typeof p.position !== 'number' || p.position < 0) return false
  if (typeof p.energy !== 'number') return false
  if (!p.items || typeof p.items !== 'object') return false
  return true
}

/** 清除存档 */
function clearLocalStorage() {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch (e) {
    // 忽略
  }
}

/** 创建初始玩家状态（从设置中读取道具与能量） */
function createInitialPlayer() {
  const settings = getSettings()
  return {
    position: 0,
    items: {
      ICE_CARD: settings.initialItems.ICE_CARD,
      REROLL_CARD: settings.initialItems.REROLL_CARD,
      PRECISION_DRIVE: settings.initialItems.PRECISION_DRIVE,
    },
    energy: settings.initialEnergy,
    maxEnergy: settings.maxEnergy,
    skipNextTurn: false,
    curseRoundsRemaining: 0,
    diceFloor: 0,
  }
}

/** 创建初始统计 */
function createInitialStats(): GameStats {
  return {
    totalDuration: 0,
    edgeCount: 0,
    strokeCount: 0,
    itemsUsed: 0,
    diceRolls: 0,
    chanceEvents: 0,
    combo: 0,
    maxCombo: 0,
  }
}

/** 创建初始游戏状态 */
function createInitialState() {
  const settings = getSettings()
  return {
    gamePhase: 'IDLE' as GamePhase,
    activeModal: null as ModalType,
    isGameStarted: false,
    player: createInitialPlayer(),
    diceValue: null,
    diceRolling: false,
    precisionMode: false,
    isMoving: false,
    activeChanceCard: null,
    edgeCountdown: settings.edgeCountdownSeconds,
    nextEdgeBonus: 0,
    bpmBeatCount: 0,
    bpmTotalBeats: 0,
    bpmLabel: '',
    currentMedia: null,
    tiles: TILES,
    pathLength: PATH_LENGTH,
    stats: createInitialStats(),
    gameStartTime: 0,
    finalTitle: '',
    finalDescription: '',
  }
}

export const useGameStore = create<GameState>((set, get) => {
  /**
   * 逐格移动玩家到目标位置（带动画与音效）
   * @param targetPos 目标路径序号
   * @param onComplete 移动完成回调
   */
  const movePlayerStepByStep = (
    targetPos: number,
    onComplete: () => void
  ) => {
    // 互斥：清除上一次未完成的移动动画
    clearMoveAnimTimer()

    const { player } = get()
    const direction = targetPos > player.position ? 1 : -1
    const steps = Math.abs(targetPos - player.position)

    if (steps === 0) {
      onComplete()
      return
    }

    set({ isMoving: true })

    let currentStep = 0

    const animateStep = () => {
      currentStep++
      const { player: p } = get()
      const nextPos = p.position + direction
      soundEngine.playStep()
      set({ player: { ...p, position: nextPos } })

      if (currentStep >= steps) {
        set({ isMoving: false })
        moveAnimTimer = null
        onComplete()
      } else {
        moveAnimTimer = setTimeout(animateStep, MOVE_INTERVAL_MS)
      }
    }

    moveAnimTimer = setTimeout(animateStep, 100)
  }

  return {
    ...createInitialState(),

    // ===== 初始化游戏 =====
    initGame: () => {
      soundEngine.init()
      const settings = getSettings()
      soundEngine.enabled = settings.soundEnabled
      const newTiles = generateTilesWithSettings(
        settings.boardSize,
        settings.tileWeights
      )
      const newPathLength = newTiles.length

      set({
        ...createInitialState(),
        isGameStarted: true,
        gameStartTime: Date.now(),
        tiles: newTiles,
        pathLength: newPathLength,
      })
    },

    // ===== 掷骰子 =====
    rollDice: () => {
      const { gamePhase, player } = get()
      if (gamePhase !== 'IDLE') return

      // 跳过本轮检测
      if (player.skipNextTurn) {
        soundEngine.playError()
        set({
          player: { ...player, skipNextTurn: false },
          gamePhase: 'IDLE',
        })
        return
      }

      soundEngine.playDiceRoll()
      set({ diceRolling: true, gamePhase: 'ROLLING' })

      // 600ms 后停止滚动，显示结果
      const diceTimer = setTimeout(() => {
        const cursed = player.curseRoundsRemaining > 0
        const floor = Math.max(0, Math.min(5, player.diceFloor))
        let value: number
        if (cursed) {
          value = Math.floor(Math.random() * 3) + 1
        } else if (floor > 0) {
          value = Math.floor(Math.random() * (6 - floor + 1)) + floor
        } else {
          value = Math.floor(Math.random() * 6) + 1
        }
        soundEngine.playDiceLand()
        set((state) => ({
          diceValue: value,
          diceRolling: false,
          player: {
            ...state.player,
            curseRoundsRemaining: cursed ? Math.max(0, state.player.curseRoundsRemaining - 1) : state.player.curseRoundsRemaining,
            diceFloor: 0,
          },
          stats: {
            ...state.stats,
            diceRolls: state.stats.diceRolls + 1,
          },
        }))
      }, 600)
      registerGameTimer(diceTimer)
    },

    // ===== 确认移动（逐格动画移动） =====
    confirmMove: () => {
      const { diceValue, gamePhase } = get()
      if (gamePhase !== 'ROLLING' || diceValue === null) return

      const { player } = get()
      const maxPos = Math.max(0, get().pathLength - 1)
      const targetPos = Math.min(maxPos, player.position + diceValue)

      set({ gamePhase: 'MOVING' })

      movePlayerStepByStep(targetPos, () => {
        get().triggerTileEvent()
      })
    },

    // ===== 触发地块事件 =====
    triggerTileEvent: () => {
      const { player } = get()
      const tile = get().tiles[player.position]
      if (!tile) return

      const settings = getSettings()

      switch (tile.type) {
        case 'FINISH': {
          // 到达终点，先触发高潮庆祝场景
          const stats = get().stats
          const startTime = get().gameStartTime
          const duration = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0
          const title = getTitleByStats(stats)
          // 优先使用专属高潮素材，未上传时回退到常规素材池
          const climaxMedia = settings.mediaEnabled ? drawClimaxMedia() : null
          const finalMedia = climaxMedia ?? safeDrawMedia(settings.mediaEnabled)
          set({
            gamePhase: 'FINISHED',
            activeModal: 'CLIMAX',
            stats: { ...stats, totalDuration: duration },
            finalTitle: title.title,
            finalDescription: title.description,
            currentMedia: finalMedia,
          })
          break
        }

        case 'EDGE': {
          soundEngine.playEdgeTrigger()
          const bonus = get().nextEdgeBonus
          set({
            gamePhase: 'EVENT',
            activeModal: 'EDGE',
            edgeCountdown: settings.edgeCountdownSeconds + bonus,
            nextEdgeBonus: 0,
            currentMedia: safeDrawMedia(settings.mediaEnabled),
            stats: {
              ...get().stats,
              edgeCount: get().stats.edgeCount + 1,
            },
          })
          break
        }

        case 'SLOW':
        case 'MEDIUM':
        case 'FAST': {
          const bpmKey = `bpm${tile.type.charAt(0)}${tile.type.slice(1).toLowerCase()}` as keyof typeof settings
          const bpmSetting = settings[bpmKey] as { bpm: number; totalBeats: number } | undefined
          const fallback = BPM_CONFIG[tile.type as 'SLOW' | 'MEDIUM' | 'FAST']
          const totalBeats = bpmSetting?.totalBeats ?? fallback.totalBeats
          set({
            gamePhase: 'EVENT',
            activeModal: tile.type as ModalType,
            bpmBeatCount: 0,
            bpmTotalBeats: totalBeats,
            bpmLabel: `${tile.type === 'SLOW' ? '慢速' : tile.type === 'MEDIUM' ? '中速' : '快速'}节拍`,
            currentMedia: safeDrawMedia(settings.mediaEnabled),
          })
          break
        }

        case 'LUBE': {
          // 润滑格：恢复 1 点能量
          const newEnergy = Math.min(player.maxEnergy, player.energy + 1)
          set({
            gamePhase: 'EVENT',
            activeModal: 'LUBE',
            player: { ...player, energy: newEnergy },
          })
          break
        }

        case 'ARROW': {
          const arrowStep = tile.arrowStep ?? 0
          const maxPos = Math.max(0, get().pathLength - 1)
          const targetPos = Math.max(
            0,
            Math.min(maxPos, player.position + arrowStep)
          )
          set({
            gamePhase: 'EVENT',
            activeModal: 'ARROW',
          })
          // 短暂展示后自动移动
          const arrowTimer = setTimeout(() => {
            set({ activeModal: null })
            movePlayerStepByStep(targetPos, () => {
              get().triggerTileEvent()
            })
          }, 1500)
          registerGameTimer(arrowTimer)
          break
        }

        case 'CHANCE': {
          soundEngine.playChanceTrigger()
          const card = drawRandomChanceCard()
          set({
            gamePhase: 'EVENT',
            activeModal: 'CHANCE',
            activeChanceCard: card,
            stats: {
              ...get().stats,
              chanceEvents: get().stats.chanceEvents + 1,
            },
          })
          break
        }

        default:
          // START 或其他普通格：无事发生
          set({ gamePhase: 'IDLE' })
          break
      }
    },

    // ===== 关闭弹窗 =====
    closeModal: () => {
      const { activeModal, stats } = get()
      const isChallenge =
        activeModal === 'EDGE' ||
        activeModal === 'SLOW' ||
        activeModal === 'MEDIUM' ||
        activeModal === 'FAST'
      set({
        activeModal: null,
        gamePhase: 'IDLE',
        currentMedia: null,
        ...(isChallenge ? { stats: { ...stats, combo: 0 } } : {}),
      })
      saveToLocalStorage(get())
    },

    // ===== 寸止倒计时完成 =====
    completeEdgeCountdown: () => {
      soundEngine.playCountdownEnd()
      const { stats } = get()
      const newCombo = stats.combo + 1
      const newMaxCombo = Math.max(stats.maxCombo, newCombo)
      set({
        activeModal: null,
        gamePhase: 'IDLE',
        currentMedia: null,
        stats: {
          ...stats,
          strokeCount: stats.strokeCount + 1,
          combo: newCombo,
          maxCombo: newMaxCombo,
        },
      })
      saveToLocalStorage(get())
    },

    // ===== BPM 节拍增加 =====
    addBPMBeat: () => {
      set((state) => ({
        bpmBeatCount: state.bpmBeatCount + 1,
        stats: {
          ...state.stats,
          strokeCount: state.stats.strokeCount + 1,
        },
      }))
    },

    // ===== BPM 完成 =====
    completeBPM: () => {
      soundEngine.playCountdownEnd()
      soundEngine.stopMetronome()
      const { stats } = get()
      const newCombo = stats.combo + 1
      const newMaxCombo = Math.max(stats.maxCombo, newCombo)
      set({
        activeModal: null,
        gamePhase: 'IDLE',
        currentMedia: null,
        stats: {
          ...stats,
          combo: newCombo,
          maxCombo: newMaxCombo,
        },
      })
      saveToLocalStorage(get())
    },

    // ===== 使用道具 =====
    useItem: (type: ItemType) => {
      const { player, gamePhase, activeModal } = get()
      if ((player.items[type] ?? 0) <= 0) return

      switch (type) {
        case 'ICE_CARD': {
          // 使用冷静卡 = 放弃挑战，combo 清零
          // 免除当前格子的任务要求，跳过本轮
          if (gamePhase !== 'EVENT' || activeModal === null) return
          soundEngine.playItemUse()
          soundEngine.stopMetronome()
          set({
            player: { ...player, items: { ...player.items, [type]: player.items[type] - 1 } },
            activeModal: null,
            gamePhase: 'IDLE',
            currentMedia: null,
            stats: { ...get().stats, itemsUsed: get().stats.itemsUsed + 1 },
          })
          break
        }

        case 'REROLL_CARD': {
          // 重新掷骰子（仅在骰子已掷但未移动时可用）
          if (gamePhase !== 'ROLLING' && get().diceValue === null) return
          if (gamePhase !== 'ROLLING' && gamePhase !== 'IDLE') return
          soundEngine.playItemUse()
          set({
            player: { ...player, items: { ...player.items, [type]: player.items[type] - 1 } },
            diceValue: null,
            diceRolling: true,
            gamePhase: 'ROLLING',
            stats: { ...get().stats, itemsUsed: get().stats.itemsUsed + 1 },
          })
          const rerollTimer = setTimeout(() => {
            const value = Math.floor(Math.random() * 6) + 1
            soundEngine.playDiceLand()
            set({ diceValue: value, diceRolling: false })
          }, 600)
          registerGameTimer(rerollTimer)
          break
        }

        case 'PRECISION_DRIVE': {
          // 消耗 1 点能量，进入精准控制模式
          if (gamePhase !== 'IDLE') return
          if (player.energy <= 0) return
          soundEngine.playItemUse()
          set({
            player: { ...player, items: { ...player.items, [type]: player.items[type] - 1 }, energy: player.energy - 1 },
            precisionMode: true,
            stats: { ...get().stats, itemsUsed: get().stats.itemsUsed + 1 },
          })
          break
        }
      }
    },

    // ===== 精准控制选择步数 =====
    usePrecisionDrive: (steps: number) => {
      const { player, precisionMode } = get()
      if (!precisionMode) return
      if (steps < 1 || steps > 3) return

      const maxPos = Math.max(0, get().pathLength - 1)
      const targetPos = Math.min(maxPos, player.position + steps)
      set({ precisionMode: false, gamePhase: 'MOVING' })

      movePlayerStepByStep(targetPos, () => {
        get().triggerTileEvent()
      })
    },

    // ===== 应用命运卡片效果 =====
    applyChanceCard: () => {
      const card = get().activeChanceCard
      if (!card) return

      const { player } = get()
      const effect: ChanceEffect = card.effect

      // 先关闭弹窗
      set({ activeModal: null, activeChanceCard: null })

      switch (effect) {
        case 'SKIP_TURN':
          set({
            player: { ...player, skipNextTurn: true },
            gamePhase: 'IDLE',
          })
          break

        case 'EDGE_INSTANT': {
          // 原地寸止，进入寸止弹窗
          soundEngine.playEdgeTrigger()
          set({
            gamePhase: 'EVENT',
            activeModal: 'EDGE',
            edgeCountdown: card.value,
            stats: {
              ...get().stats,
              edgeCount: get().stats.edgeCount + 1,
            },
          })
          break
        }

        case 'MOVE_BACK': {
          const targetPos = Math.max(0, player.position - card.value)
          soundEngine.playError()
          set({ gamePhase: 'MOVING' })
          movePlayerStepByStep(targetPos, () => {
            get().triggerTileEvent()
          })
          break
        }

        case 'MOVE_FORWARD': {
          const maxPos = Math.max(0, get().pathLength - 1)
          const targetPos = Math.min(maxPos, player.position + card.value)
          soundEngine.playStep()
          set({ gamePhase: 'MOVING' })
          movePlayerStepByStep(targetPos, () => {
            get().triggerTileEvent()
          })
          break
        }

        case 'GAIN_ITEM': {
          // 获得道具：支持指定类型（targetItem）或随机，value 表示数量
          const itemTypes: ItemType[] = ['ICE_CARD', 'REROLL_CARD', 'PRECISION_DRIVE']
          const gainType = card.targetItem ?? itemTypes[Math.floor(Math.random() * itemTypes.length)]
          const currentItem = player.items[gainType]
          const maxCount = ITEMS_CONFIG[gainType].maxCount
          const gainCount = card.value || 1
          const newItems = {
            ...player.items,
            [gainType]: Math.min(maxCount, currentItem + gainCount),
          }
          soundEngine.playItemUse()
          set({
            player: { ...player, items: newItems },
            gamePhase: 'IDLE',
          })
          break
        }

        case 'GAIN_ENERGY': {
          const newEnergy = Math.min(player.maxEnergy, player.energy + card.value)
          soundEngine.playItemUse()
          set({
            player: { ...player, energy: newEnergy },
            gamePhase: 'IDLE',
          })
          break
        }

        case 'LOSE_ENERGY': {
          const newEnergy = Math.max(0, player.energy - card.value)
          soundEngine.playError()
          set({
            player: { ...player, energy: newEnergy },
            gamePhase: 'IDLE',
          })
          break
        }

        case 'BPM_INSTANT': {
          // 原地触发随机 BPM（慢/中/快随机）
          const speeds: Array<'SLOW' | 'MEDIUM' | 'FAST'> = ['SLOW', 'MEDIUM', 'FAST']
          const randomSpeed = speeds[Math.floor(Math.random() * speeds.length)]
          const bpmConfig = BPM_CONFIG[randomSpeed]
          const bpmSettings = getSettings()
          soundEngine.playEdgeTrigger()
          set({
            gamePhase: 'EVENT',
            activeModal: randomSpeed,
            bpmBeatCount: 0,
            bpmTotalBeats: bpmConfig.totalBeats,
            bpmLabel: bpmConfig.label,
            currentMedia: safeDrawMedia(bpmSettings.mediaEnabled),
            stats: {
              ...get().stats,
              strokeCount: get().stats.strokeCount + 1,
            },
          })
          break
        }

        case 'EDGE_BONUS': {
          // 下次寸止倒计时加时
          soundEngine.playError()
          set({
            nextEdgeBonus: get().nextEdgeBonus + card.value,
            gamePhase: 'IDLE',
          })
          break
        }

        case 'LOSE_ITEM': {
          // 随机丢失一个已持有的道具
          const ownedItems = (['ICE_CARD', 'REROLL_CARD', 'PRECISION_DRIVE'] as ItemType[]).filter(
            (t) => player.items[t] > 0
          )
          if (ownedItems.length > 0) {
            const randomType = ownedItems[Math.floor(Math.random() * ownedItems.length)]
            const newItems = { ...player.items, [randomType]: player.items[randomType] - 1 }
            soundEngine.playError()
            set({
              player: { ...player, items: newItems },
              gamePhase: 'IDLE',
            })
          } else {
            set({ gamePhase: 'IDLE' })
          }
          break
        }

        case 'ZERO_ENERGY': {
          soundEngine.playError()
          set({
            player: { ...player, energy: 0 },
            gamePhase: 'IDLE',
          })
          break
        }

        case 'CURSE_ROLL': {
          soundEngine.playError()
          set({
            player: { ...player, curseRoundsRemaining: player.curseRoundsRemaining + card.value },
            gamePhase: 'IDLE',
          })
          break
        }

        case 'DRAW_AGAIN': {
          // 立即再抽一张命运卡
          soundEngine.playItemUse()
          const nextCard = drawRandomChanceCard()
          set({
            activeChanceCard: nextCard,
            gamePhase: 'EVENT',
            activeModal: 'CHANCE',
          })
          break
        }

        case 'DICE_FLOOR': {
          // 下轮骰子保底
          soundEngine.playItemUse()
          set({
            player: { ...player, diceFloor: card.value },
            gamePhase: 'IDLE',
          })
          break
        }

        default:
          set({ gamePhase: 'IDLE' })
          break
      }
    },

    // ===== 高潮场景完成，进入战绩面板 =====
    completeClimax: () => {
      soundEngine.playVictory()
      set({
        activeModal: 'STATS',
        currentMedia: null,
      })
    },

    // ===== 重置游戏 =====
    resetGame: () => {
      soundEngine.stopMetronome()
      clearMoveAnimTimer()
      clearAllGameTimers()
      clearLocalStorage()
      const settings = getSettings()
      soundEngine.enabled = settings.soundEnabled
      const newTiles = generateTilesWithSettings(
        settings.boardSize,
        settings.tileWeights
      )
      set({
        ...createInitialState(),
        isGameStarted: true,
        gameStartTime: Date.now(),
        tiles: newTiles,
        pathLength: newTiles.length,
      })
    },

    // ===== 存档管理 =====
    hasSavedGame: () => {
      return loadFromLocalStorage() !== null
    },

    loadSavedGame: () => {
      const save = loadFromLocalStorage()
      if (!save) return
      soundEngine.init()
      const settings = getSettings()
      soundEngine.enabled = settings.soundEnabled
      set({
        ...createInitialState(),
        isGameStarted: true,
        player: save.player,
        stats: save.stats,
        tiles: save.tiles,
        pathLength: save.pathLength,
        gameStartTime: save.gameStartTime,
      })
    },

    clearSave: () => {
      clearLocalStorage()
    },

    // ===== 获取当前地块类型 =====
    getCurrentTileType: () => {
      const tile = get().tiles[get().player.position]
      return tile?.type ?? 'START'
    },
  }
})

/** 导出地块数据供组件使用 */
export { TILES }
