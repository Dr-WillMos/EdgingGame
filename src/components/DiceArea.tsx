/**
 * 骰子与操作栏组件
 * ========================================
 * 包含骰子展示、掷骰按钮、移动确认、精准控制模式。
 * 根据游戏阶段动态切换操作面板。
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Dices, Check, ArrowRight, Zap, SkipForward } from 'lucide-react'
import Dice from './Dice'
import { useGameStore } from '../store/useGameStore'

export default function DiceArea() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const diceValue = useGameStore((s) => s.diceValue)
  const diceRolling = useGameStore((s) => s.diceRolling)
  const precisionMode = useGameStore((s) => s.precisionMode)
  const playerSkipNextTurn = useGameStore((s) => s.player.skipNextTurn)

  const rollDice = useGameStore((s) => s.rollDice)
  const confirmMove = useGameStore((s) => s.confirmMove)
  const usePrecisionDrive = useGameStore((s) => s.usePrecisionDrive)

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-4">
      {/* 骰子区域 */}
      <Dice />

      {/* 操作按钮区域 */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          {/* 精准控制模式 */}
          {precisionMode && (
            <motion.div
              key="precision"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2 text-neon-blue neon-text-blue">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-bold">精准控制 — 选择步数</span>
              </div>
              <div className="flex gap-3">
                {[1, 2, 3].map((steps) => (
                  <button
                    key={steps}
                    onClick={() => usePrecisionDrive(steps)}
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xl border-2 border-neon-blue/50 btn-cyber transition-all hover:scale-105"
                  >
                    {steps}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* IDLE 状态：掷骰子 */}
          {!precisionMode && gamePhase === 'IDLE' && (
            <motion.button
              key="roll"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={rollDice}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold btn-cyber transition-all"
            >
              <Dices className="w-5 h-5" />
              {playerSkipNextTurn ? '跳过本轮' : '掷骰子'}
            </motion.button>
          )}

          {/* ROLLING 状态：等待确认 */}
          {!precisionMode && gamePhase === 'ROLLING' && !diceRolling && diceValue !== null && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-2"
            >
              <p className="text-center text-slate-400 text-sm">
                骰子点数：<span className="text-neon-yellow font-bold">{diceValue}</span>
              </p>
              <button
                onClick={confirmMove}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold btn-cyber transition-all"
              >
                <ArrowRight className="w-5 h-5" />
                前进 {diceValue} 格
              </button>
            </motion.div>
          )}

          {/* ROLLING 状态：正在滚动 */}
          {!precisionMode && gamePhase === 'ROLLING' && diceRolling && (
            <motion.div
              key="rolling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-slate-400 text-sm py-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block mb-2"
              >
                <Dices className="w-6 h-6 text-neon-blue" />
              </motion.div>
              <p>骰子滚动中...</p>
            </motion.div>
          )}

          {/* MOVING 状态 */}
          {!precisionMode && gamePhase === 'MOVING' && (
            <motion.div
              key="moving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-slate-400 text-sm py-3"
            >
              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-flex items-center gap-2"
              >
                <ArrowRight className="w-5 h-5 text-neon-blue" />
                <span>棋子移动中...</span>
              </motion.div>
            </motion.div>
          )}

          {/* EVENT 状态 */}
          {!precisionMode && gamePhase === 'EVENT' && (
            <motion.div
              key="event"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-slate-400 text-sm py-3"
            >
              <SkipForward className="w-5 h-5 inline mr-2 text-neon-purple" />
              请完成弹窗中的任务
            </motion.div>
          )}

          {/* FINISHED 状态 */}
          {!precisionMode && gamePhase === 'FINISHED' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-neon-yellow text-sm py-3 font-bold"
            >
              🎉 游戏结束！
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
