/**
 * 寸止挑战 · Edging Challenge Game
 * ========================================
 * 主应用组件，包含开始界面、设置界面与游戏主界面。
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Gamepad2, Info, Settings as SettingsIcon } from 'lucide-react'
import { useGameStore } from './store/useGameStore'
import { initCustomMedia, warmMediaCache, initClimaxMedia } from './config/mediaConfig'
import AgeGate, { isAgeConfirmed } from './components/AgeGate'
import GameBoard from './components/GameBoard'
import DiceArea from './components/DiceArea'
import Inventory from './components/Inventory'
import EventModal from './components/EventModal'
import StatsModal from './components/StatsModal'
import ClimaxScene from './components/ClimaxScene'
import SettingsScreen from './components/SettingsScreen'
import ErrorBoundary from './components/ErrorBoundary'

type Screen = 'start' | 'settings' | 'game'

export default function App() {
  const isGameStarted = useGameStore((s) => s.isGameStarted)
  const [screen, setScreen] = useState<Screen>('start')
  const [agePassed, setAgePassed] = useState(isAgeConfirmed())

  // 启动时恢复用户上传的自定义媒体（常规 + 高潮）
  useEffect(() => {
    initCustomMedia().catch((err) => {
      console.warn('[App] 自定义素材恢复失败:', err)
    })
    initClimaxMedia().catch((err) => {
      console.warn('[App] 高潮素材恢复失败:', err)
    })
  }, [])

  // 年龄验证未通过时拦截
  if (!agePassed) {
    return <AgeGate onConfirm={() => setAgePassed(true)} />
  }

  // 游戏已启动后直接显示游戏界面
  if (isGameStarted) {
    return (
      <ErrorBoundary>
        <GameScreen />
      </ErrorBoundary>
    )
  }

  // 设置界面
  if (screen === 'settings') {
    return (
      <ErrorBoundary>
        <SettingsScreen
          onStart={() => setScreen('game')}
          onBack={() => setScreen('start')}
        />
      </ErrorBoundary>
    )
  }

  // 从设置进入游戏：触发 initGame
  if (screen === 'game') {
    return <GameStartWrapper />
  }

  // 默认开始界面
  return <StartScreen onSettings={() => setScreen('settings')} />
}

/**
 * 包装组件：挂载时触发 initGame，然后渲染游戏界面
 */
function GameStartWrapper() {
  const initGame = useGameStore((s) => s.initGame)
  const isGameStarted = useGameStore((s) => s.isGameStarted)

  useEffect(() => {
    if (!isGameStarted) {
      initGame()
    }
  }, [initGame, isGameStarted])

  if (!isGameStarted) {
    return (
      <div className="min-h-screen bg-board-bg flex items-center justify-center">
        <div className="text-slate-400 text-sm">加载中...</div>
      </div>
    )
  }

  return <GameScreen />
}

/**
 * 游戏主界面
 */
function GameScreen() {
  const player = useGameStore((s) => s.player)
  const stats = useGameStore((s) => s.stats)
  const tiles = useGameStore((s) => s.tiles)
  const pathLength = useGameStore((s) => s.pathLength)

  // 进入游戏后预热 3 张媒体到浏览器缓存，减少事件触发时的加载等待
  useEffect(() => {
    warmMediaCache(3)
  }, [])

  // 计算进度百分比
  const progressPercent = pathLength > 1 ? Math.round((player.position / (pathLength - 1)) * 100) : 0
  const currentTile = tiles[player.position]

  return (
    <div className="min-h-screen cyber-grid-bg bg-board-bg text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部标题栏 */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-neon-blue" />
            <h1 className="text-lg md:text-xl font-bold text-neon-blue neon-text-blue">
              寸止挑战
            </h1>
            <span className="text-xs text-slate-500 hidden md:inline">Edging Challenge</span>
          </div>

          {/* 实时进度 */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">
              位置 <span className="text-neon-yellow font-bold">{player.position}</span> / {pathLength - 1}
            </div>
            <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-neon-blue to-neon-yellow rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', stiffness: 200 }}
              />
            </div>
            <div className="text-xs font-mono text-neon-yellow">{progressPercent}%</div>
          </div>
        </header>

        {/* 主游戏区 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* 左侧：棋盘 */}
          <div className="flex flex-col items-center gap-4">
            <GameBoard />

            {/* 当前格信息 */}
            <div className="glass-card rounded-xl px-6 py-3 flex items-center gap-4">
              <div className="text-xs text-slate-400">当前格</div>
              <div className={`px-3 py-1 rounded-lg font-bold text-sm ${
                currentTile?.type === 'EDGE' ? 'bg-yellow-400 text-black' :
                currentTile?.type === 'SLOW' ? 'bg-blue-900 text-white' :
                currentTile?.type === 'MEDIUM' ? 'bg-cyan-700 text-white' :
                currentTile?.type === 'FAST' ? 'bg-sky-400 text-black' :
                currentTile?.type === 'CHANCE' ? 'bg-purple-700 text-white' :
                currentTile?.type === 'LUBE' ? 'bg-white text-red-600' :
                currentTile?.type === 'ARROW' ? 'bg-orange-600 text-white' :
                currentTile?.type === 'FINISH' ? 'bg-amber-500 text-black' :
                'bg-emerald-600 text-white'
              }`}>
                {currentTile?.type === 'START' ? '起点' :
                 currentTile?.type === 'FINISH' ? '终点' :
                 currentTile?.type === 'EDGE' ? '寸止' :
                 currentTile?.type === 'SLOW' ? '慢速' :
                 currentTile?.type === 'MEDIUM' ? '中速' :
                 currentTile?.type === 'FAST' ? '快速' :
                 currentTile?.type === 'CHANCE' ? '命运' :
                 currentTile?.type === 'LUBE' ? '润滑' :
                 currentTile?.type === 'ARROW' ? '箭头' : '普通'}
              </div>
              {player.skipNextTurn && (
                <div className="text-xs text-neon-red font-bold">⚠ 下轮跳过</div>
              )}
            </div>

            {/* 实时统计（简略） */}
            <div className="flex gap-3 flex-wrap justify-center">
              <MiniStat label="寸止" value={stats.edgeCount} color="text-neon-yellow" />
              <MiniStat label="撸动" value={stats.strokeCount} color="text-neon-red" />
              <MiniStat label="命运" value={stats.chanceEvents} color="text-neon-purple" />
              <MiniStat label="道具" value={stats.itemsUsed} color="text-neon-green" />
            </div>
          </div>

          {/* 右侧：操作面板 */}
          <div className="flex flex-col gap-4">
            <DiceArea />
            <Inventory />
          </div>
        </div>

        {/* 事件弹窗 */}
        <EventModal />
        <StatsModal />
        {/* 通关高潮庆祝场景 */}
        <ClimaxScene />
      </div>
    </div>
  )
}

/** 迷你统计标签 */
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  )
}

/**
 * 开始界面
 */
function StartScreen({ onSettings }: { onSettings: () => void }) {
  const hasSavedGame = useGameStore((s) => s.hasSavedGame)
  const loadSavedGame = useGameStore((s) => s.loadSavedGame)
  const [hasSave, setHasSave] = useState(false)

  useEffect(() => {
    setHasSave(hasSavedGame())
  }, [hasSavedGame])

  return (
    <div className="min-h-screen cyber-grid-bg bg-board-bg flex items-center justify-center p-4">
      <motion.div
        className="max-w-2xl w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 标题 */}
        <motion.h1
          className="text-5xl md:text-6xl font-bold mb-3"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-red bg-clip-text text-transparent">
            寸止挑战
          </span>
        </motion.h1>
        <p className="text-slate-400 text-lg mb-8">Edging Challenge Game</p>

        {/* 说明卡片 */}
        <motion.div
          className="glass-card rounded-2xl p-6 mb-8 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-neon-blue" />
            <h2 className="text-sm font-bold text-neon-blue">游戏规则</h2>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p>🎲 掷骰子沿螺旋棋盘前进，从外圈走向中心终点。</p>
            <p>🟡 踩中寸止格：触发倒计时 + 呼吸引导。</p>
            <p>🔵 踩中慢速/中速/快速格：跟随 BPM 节拍器完成指定次数。</p>
            <p>🟣 踩中命运格：随机抽卡，可能是奖励或惩罚。</p>
            <p>⚪ 踩中润滑格：调整状态，安全通过。</p>
            <p>🟠 踩中箭头格：随机前进或后退。</p>
            <p>🛡️ 使用道具卡应对危机，精准控制自选步数。</p>
            <p>🏆 到达中心终点通关，获取专属称号！</p>
          </div>
        </motion.div>

        {/* 操作按钮 */}
        <motion.button
          onClick={onSettings}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold text-lg btn-cyber transition-all shadow-[0_0_30px_rgba(0,240,255,0.3)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Play className="w-6 h-6" />
          开始挑战
        </motion.button>

        {/* 继续游戏按钮 */}
        {hasSave && (
          <motion.button
            onClick={() => loadSavedGame()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="block mx-auto mt-3 px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold transition-all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            继续上次游戏
          </motion.button>
        )}

        {/* 地块图例 */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { label: '起点', bg: 'bg-emerald-600', text: 'text-white' },
            { label: '寸止', bg: 'bg-yellow-400', text: 'text-black' },
            { label: '慢速', bg: 'bg-blue-900', text: 'text-white' },
            { label: '中速', bg: 'bg-cyan-700', text: 'text-white' },
            { label: '快速', bg: 'bg-sky-400', text: 'text-black' },
            { label: '润滑', bg: 'bg-white', text: 'text-red-600' },
            { label: '箭头', bg: 'bg-orange-600', text: 'text-white' },
            { label: '命运', bg: 'bg-purple-700', text: 'text-white' },
            { label: '终点', bg: 'bg-amber-500', text: 'text-black' },
          ].map((tile) => (
            <div
              key={tile.label}
              className={`px-3 py-1 rounded-md text-xs font-bold ${tile.bg} ${tile.text}`}
            >
              {tile.label}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
