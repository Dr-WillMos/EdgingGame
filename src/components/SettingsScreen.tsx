/**
 * 设置界面组件
 * ========================================
 * 游戏开始前的全配置界面。
 * 所有游戏参数均可在此调整，设置在开始游戏时生效。
 */

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Clock,
  Music,
  Map as MapIcon,
  Package,
  Zap,
  Volume2,
  Image,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import MediaUploader, { type MediaUploaderHandle } from './MediaUploader'
import { getCustomMediaCount, getBuiltinMediaCount, getClimaxMediaCount } from '../config/mediaConfig'

interface SettingsScreenProps {
  onStart: () => void
  onBack: () => void
}

/** 数字输入框 */
function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label className="text-xs text-slate-400">{label}</label>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min ?? 0, value - step))}
          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center justify-center"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            if (e.target.value === '') return
            const v = parseInt(e.target.value) || 0
            if (min !== undefined && v < min) return
            if (max !== undefined && v > max) return
            onChange(v)
          }}
          className="w-14 text-center bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs text-white font-mono"
          min={min}
          max={max}
          step={step}
        />
        <button
          onClick={() => onChange(Math.min(max ?? 999, value + step))}
          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center justify-center"
        >
          +
        </button>
        {suffix && <span className="text-xs text-slate-500 w-8">{suffix}</span>}
      </div>
    </div>
  )
}

/** 开关组件 */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <label className="text-xs text-slate-400">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-neon-blue' : 'bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

/** 折叠分区 */
function CollapsibleSection({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: typeof Clock
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-neon-blue" />
          <span className="text-sm font-bold text-slate-200">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-3"
        >
          {children}
        </motion.div>
      )}
    </div>
  )
}

export default function SettingsScreen({ onStart, onBack }: SettingsScreenProps) {
  const { settings, updateSettings, resetSettings } = useSettingsStore()
  const uploaderRef = useRef<MediaUploaderHandle>(null)
  const climaxUploaderRef = useRef<MediaUploaderHandle>(null)
  const [climaxCount, setClimaxCount] = useState(getClimaxMediaCount())

  return (
    <div className="min-h-screen cyber-grid-bg bg-board-bg p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-neon-blue" />
            <h1 className="text-xl font-bold text-neon-blue neon-text-blue">游戏设置</h1>
          </div>
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← 返回
          </button>
        </div>

        {/* 设置列表 */}
        <div className="space-y-3 mb-6">
          {/* 寸止设置 */}
          <CollapsibleSection icon={Clock} title="寸止设置" defaultOpen>
            <NumberInput
              label="倒计时秒数"
              value={settings.edgeCountdownSeconds}
              onChange={(v) => updateSettings({ edgeCountdownSeconds: v })}
              min={5}
              max={120}
              suffix="秒"
            />
          </CollapsibleSection>

          {/* 节拍器设置 */}
          <CollapsibleSection icon={Music} title="节拍器设置" defaultOpen>
            <div className="text-xs text-slate-500 mb-2 mt-1 font-bold">慢速</div>
            <NumberInput
              label="BPM"
              value={settings.bpmSlow.bpm}
              onChange={(v) => updateSettings({ bpmSlow: { ...settings.bpmSlow, bpm: v } })}
              min={20}
              max={300}
            />
            <NumberInput
              label="总次数"
              value={settings.bpmSlow.totalBeats}
              onChange={(v) => updateSettings({ bpmSlow: { ...settings.bpmSlow, totalBeats: v } })}
              min={1}
              max={200}
              suffix="次"
            />

            <div className="text-xs text-slate-500 mb-2 mt-3 font-bold">中速</div>
            <NumberInput
              label="BPM"
              value={settings.bpmMedium.bpm}
              onChange={(v) => updateSettings({ bpmMedium: { ...settings.bpmMedium, bpm: v } })}
              min={20}
              max={300}
            />
            <NumberInput
              label="总次数"
              value={settings.bpmMedium.totalBeats}
              onChange={(v) => updateSettings({ bpmMedium: { ...settings.bpmMedium, totalBeats: v } })}
              min={1}
              max={200}
              suffix="次"
            />

            <div className="text-xs text-slate-500 mb-2 mt-3 font-bold">快速</div>
            <NumberInput
              label="BPM"
              value={settings.bpmFast.bpm}
              onChange={(v) => updateSettings({ bpmFast: { ...settings.bpmFast, bpm: v } })}
              min={20}
              max={300}
            />
            <NumberInput
              label="总次数"
              value={settings.bpmFast.totalBeats}
              onChange={(v) => updateSettings({ bpmFast: { ...settings.bpmFast, totalBeats: v } })}
              min={1}
              max={200}
              suffix="次"
            />
          </CollapsibleSection>

          {/* 地图设置 */}
          <CollapsibleSection icon={MapIcon} title="地图设置">
            <NumberInput
              label="棋盘边长（奇数）"
              value={settings.boardSize}
              onChange={(v) => updateSettings({ boardSize: v % 2 === 0 ? v + 1 : v })}
              min={5}
              max={15}
              step={2}
              suffix="格"
            />
            <div className="text-xs text-slate-500 mb-1 mt-3 font-bold">地块出现概率（权重）</div>
            <NumberInput label="寸止格" value={settings.tileWeights.EDGE} onChange={(v) => updateSettings({ tileWeights: { ...settings.tileWeights, EDGE: v } })} min={0} max={20} />
            <NumberInput label="慢速格" value={settings.tileWeights.SLOW} onChange={(v) => updateSettings({ tileWeights: { ...settings.tileWeights, SLOW: v } })} min={0} max={20} />
            <NumberInput label="中速格" value={settings.tileWeights.MEDIUM} onChange={(v) => updateSettings({ tileWeights: { ...settings.tileWeights, MEDIUM: v } })} min={0} max={20} />
            <NumberInput label="快速格" value={settings.tileWeights.FAST} onChange={(v) => updateSettings({ tileWeights: { ...settings.tileWeights, FAST: v } })} min={0} max={20} />
            <NumberInput label="润滑格" value={settings.tileWeights.LUBE} onChange={(v) => updateSettings({ tileWeights: { ...settings.tileWeights, LUBE: v } })} min={0} max={20} />
            <NumberInput label="箭头格" value={settings.tileWeights.ARROW} onChange={(v) => updateSettings({ tileWeights: { ...settings.tileWeights, ARROW: v } })} min={0} max={20} />
            <NumberInput label="命运格" value={settings.tileWeights.CHANCE} onChange={(v) => updateSettings({ tileWeights: { ...settings.tileWeights, CHANCE: v } })} min={0} max={20} />
          </CollapsibleSection>

          {/* 道具设置 */}
          <CollapsibleSection icon={Package} title="道具与能量设置">
            <div className="text-xs text-slate-500 mb-1 mt-1 font-bold">初始持有数量</div>
            <NumberInput label="🛡️ 冷静卡" value={settings.initialItems.ICE_CARD} onChange={(v) => updateSettings({ initialItems: { ...settings.initialItems, ICE_CARD: v } })} min={0} max={10} />
            <NumberInput label="🎲 重掷卡" value={settings.initialItems.REROLL_CARD} onChange={(v) => updateSettings({ initialItems: { ...settings.initialItems, REROLL_CARD: v } })} min={0} max={10} />
            <NumberInput label="🎯 精准控制" value={settings.initialItems.PRECISION_DRIVE} onChange={(v) => updateSettings({ initialItems: { ...settings.initialItems, PRECISION_DRIVE: v } })} min={0} max={10} />
            <div className="text-xs text-slate-500 mb-1 mt-3 font-bold">能量</div>
            <NumberInput label="初始能量" value={settings.initialEnergy} onChange={(v) => updateSettings({ initialEnergy: v })} min={0} max={20} />
            <NumberInput label="最大能量" value={settings.maxEnergy} onChange={(v) => updateSettings({ maxEnergy: v })} min={1} max={20} />
          </CollapsibleSection>

          {/* 音效与媒体 */}
          <CollapsibleSection icon={Volume2} title="音效与媒体">
            <Toggle
              label="启用音效"
              checked={settings.soundEnabled}
              onChange={(v) => updateSettings({ soundEnabled: v })}
            />
            <Toggle
              label="启用媒体幻灯片"
              checked={settings.mediaEnabled}
              onChange={(v) => updateSettings({ mediaEnabled: v })}
            />
            {settings.mediaEnabled && (
              <div className="py-1.5">
                <label className="text-xs text-slate-400 block mb-1.5">媒体来源</label>
                <div className="flex gap-1">
                  {(
                    [
                      ['custom', '仅自定义', `已上传 ${getCustomMediaCount()} 个`],
                      ['mixed', '混合', `${getBuiltinMediaCount()} 内置 + ${getCustomMediaCount()} 自定义`],
                      ['builtin', '仅内置', `${getBuiltinMediaCount()} 个`],
                    ] as const
                  ).map(([val, label, desc]) => (
                    <button
                      key={val}
                      onClick={() => updateSettings({ mediaSource: val })}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left leading-tight ${
                        settings.mediaSource === val
                          ? 'bg-neon-blue text-slate-900'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      <div>{label}</div>
                      <div className={`text-[9px] mt-0.5 ${settings.mediaSource === val ? 'text-slate-700' : 'text-slate-500'}`}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Toggle
              label="BPM 同步媒体效果"
              checked={settings.mediaEffect.enabled}
              onChange={(v) => updateSettings({ mediaEffect: { ...settings.mediaEffect, enabled: v } })}
            />
            {settings.mediaEffect.enabled && (
              <>
                <div className="flex items-center justify-between py-1.5">
                  <label className="text-xs text-slate-400">效果模式</label>
                  <div className="flex gap-1">
                    {([
                      ['pulse', '脉冲'],
                      ['shake', '抖动'],
                      ['zoom', '呼吸'],
                      ['rotate', '旋转'],
                      ['wave', '波浪'],
                    ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => updateSettings({ mediaEffect: { ...settings.mediaEffect, mode: val } })}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                          settings.mediaEffect.mode === val
                            ? 'bg-neon-blue text-slate-900'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <NumberInput
                  label="效果强度"
                  value={settings.mediaEffect.intensity}
                  onChange={(v) => updateSettings({ mediaEffect: { ...settings.mediaEffect, intensity: v } })}
                  min={1}
                  max={10}
                />
              </>
            )}
          </CollapsibleSection>

          {/* 素材管理 */}
          <CollapsibleSection icon={FolderOpen} title="素材管理">
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={() => uploaderRef.current?.refresh()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 transition-all"
                title="刷新素材列表"
              >
                <RefreshCw className="w-3 h-3" />
                刷新
              </button>
            </div>
            <MediaUploader ref={uploaderRef} />
          </CollapsibleSection>

          {/* 高潮素材管理 */}
          <CollapsibleSection icon={Sparkles} title="高潮素材（通关专属）">
            <div className="text-xs text-slate-500 mb-2 mt-1 leading-relaxed">
              此处上传的素材仅在到达终点、触发通关高潮场景时展示，与常规撸动素材相互独立。
              {climaxCount === 0 && ' 未上传时将回退到常规素材池随机抽取。'}
            </div>
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={async () => {
                  await climaxUploaderRef.current?.refresh()
                  setClimaxCount(getClimaxMediaCount())
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 transition-all"
                title="刷新高潮素材列表"
              >
                <RefreshCw className="w-3 h-3" />
                刷新
              </button>
            </div>
            <MediaUploader
              ref={climaxUploaderRef}
              mode="climax"
            />
          </CollapsibleSection>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={resetSettings}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            恢复默认
          </button>
          <button
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold btn-cyber transition-all"
          >
            <Image className="w-5 h-5" />
            开始游戏
          </button>
        </div>
      </div>
    </div>
  )
}
