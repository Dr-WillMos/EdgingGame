/**
 * Web Audio 音频合成器
 * ========================================
 * 基于 Web Audio API 实时合成所有音效，无需外部音频文件。
 * 功能：BPM 节拍器、倒计时提示音、骰子音效、胜利音效等。
 */

type BeatCallback = (beatCount: number) => void

class SoundEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private metronomeTimer: number | null = null
  private metronomeBeatCount = 0
  private isMetronomeRunning = false
  /** 音效总开关，false 时所有音效静默 */
  enabled = true
  /** 环境音 pad 节点 */
  private ambientOsc: OscillatorNode | null = null
  private ambientGain: GainNode | null = null
  private ambientOsc2: OscillatorNode | null = null
  private lfoNode: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  /** 所有音效 setTimeout 引用，用于 destroy 时统一清理 */
  private soundTimers: number[] = []

  /**
   * 注册一个音效 timer，便于统一清理
   */
  private registerTimer(fn: () => void, delay: number): void {
    const id = window.setTimeout(() => {
      this.soundTimers = this.soundTimers.filter((t) => t !== id)
      fn()
    }, delay)
    this.soundTimers.push(id)
  }

  /** 清理所有待执行的音效 timer */
  private clearAllSoundTimers(): void {
    for (const id of this.soundTimers) {
      clearTimeout(id)
    }
    this.soundTimers = []
  }

  /**
   * 初始化音频上下文（必须在用户交互后调用）
   * 浏览器安全策略要求 AudioContext 由用户手势触发创建
   */
  init(): void {
    if (this.audioContext) return

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext

    if (!AudioContextClass) {
      console.warn('[soundEngine] Web Audio API 不支持，音效将被禁用')
      this.enabled = false
      return
    }

    try {
      this.audioContext = new AudioContextClass()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.3
      this.masterGain.connect(this.audioContext.destination)
    } catch (e) {
      console.warn('[soundEngine] AudioContext 创建失败:', e)
      this.enabled = false
    }
  }

  /**
   * 恢复被浏览器挂起的音频上下文
   */
  resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {})
    }
  }

  /**
   * 合成单个音符（oscillator + gain envelope）
   * @param frequency 频率（Hz）
   * @param duration 时长（秒）
   * @param type 波形类型
   * @param volume 音量（0~1）
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.5
  ): void {
    if (!this.enabled) return
    if (!this.audioContext || !this.masterGain) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency

    // ADSR 包络
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01) // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration) // Decay + Release

    oscillator.connect(gainNode)
    gainNode.connect(this.masterGain)

    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  /**
   * 骰子滚动音效
   */
  playDiceRoll(): void {
    this.init()
    this.resume()
    // 快速连续的低频咔嗒声
    for (let i = 0; i < 6; i++) {
      this.registerTimer(() => {
        this.playTone(80 + Math.random() * 40, 0.05, 'square', 0.3)
      }, i * 60)
    }
  }

  /**
   * 骰子落地音效
   */
  playDiceLand(): void {
    this.init()
    this.resume()
    this.playTone(200, 0.15, 'triangle', 0.5)
    this.registerTimer(() => this.playTone(150, 0.1, 'triangle', 0.3), 50)
  }

  /**
   * 棋子移动音效（每步一格）
   */
  playStep(): void {
    this.init()
    this.resume()
    this.playTone(440, 0.08, 'sine', 0.2)
  }

  /**
   * 寸止格触发音效（警示长音）
   */
  playEdgeTrigger(): void {
    this.init()
    this.resume()
    this.playTone(880, 0.3, 'sawtooth', 0.4)
    this.registerTimer(() => this.playTone(660, 0.3, 'sawtooth', 0.4), 200)
    this.registerTimer(() => this.playTone(440, 0.5, 'sawtooth', 0.4), 400)
  }

  /**
   * 倒计时提示音（每秒一短音）
   * @param remainingSeconds 剩余秒数
   */
  playCountdownTick(remainingSeconds: number): void {
    this.init()
    this.resume()
    if (remainingSeconds <= 5) {
      // 最后 5 秒：急促高音 + 心跳低频
      this.playTone(1200, 0.1, 'square', 0.5)
      this.playHeartbeat(remainingSeconds)
    } else if (remainingSeconds <= 10) {
      // 最后 10 秒：中频提示
      this.playTone(800, 0.08, 'sine', 0.3)
    } else {
      // 常规倒计时：低频轻提示
      this.playTone(400, 0.05, 'sine', 0.15)
    }
  }

  /**
   * 心跳音效（低频双击 thump-thump）
   * 频率随剩余时间加快，制造紧迫感。
   * @param remainingSeconds 剩余秒数（5~1），越小越急促
   */
  playHeartbeat(remainingSeconds: number): void {
    if (!this.enabled) return
    if (!this.audioContext || !this.masterGain) return

    const now = this.audioContext.currentTime
    // 基础间隔 0.3s，剩余越少间隔越短
    const gap = 0.15 + (remainingSeconds - 1) * 0.05
    const freq = 60 + (5 - remainingSeconds) * 8 // 68~92Hz，越急越尖锐
    const vol = 0.25 + (5 - remainingSeconds) * 0.1 // 越急越响

    // 第一声 "thump"
    const osc1 = this.audioContext.createOscillator()
    const gain1 = this.audioContext.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(freq, now)
    osc1.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.15)
    gain1.gain.setValueAtTime(vol, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    osc1.connect(gain1)
    gain1.connect(this.masterGain)
    osc1.start(now)
    osc1.stop(now + 0.25)

    // 第二声 "thump"（间隔 gap 秒后）
    const osc2 = this.audioContext.createOscillator()
    const gain2 = this.audioContext.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(freq * 0.9, now + gap)
    osc2.frequency.exponentialRampToValueAtTime(freq * 0.5, now + gap + 0.15)
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.setValueAtTime(vol * 0.8, now + gap)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + gap + 0.2)
    osc2.connect(gain2)
    gain2.connect(this.masterGain)
    osc2.start(now + gap)
    osc2.stop(now + gap + 0.25)
  }

  /**
   * 倒计时结束音效（完成提示）
   */
  playCountdownEnd(): void {
    this.init()
    this.resume()
    // 上升三音
    this.playTone(523, 0.15, 'sine', 0.4) // C5
    this.registerTimer(() => this.playTone(659, 0.15, 'sine', 0.4), 150) // E5
    this.registerTimer(() => this.playTone(784, 0.3, 'sine', 0.4), 300) // G5
  }

  /**
   * 单次节拍音
   * @param isAccent 是否为强拍（每 4 拍一次）
   */
  private playBeat(isAccent: boolean): void {
    if (!this.enabled) return
    if (isAccent) {
      this.playTone(1000, 0.08, 'square', 0.4)
    } else {
      this.playTone(600, 0.06, 'sine', 0.25)
    }
  }

  /**
   * 启动 BPM 节拍器
   * @param bpm 每分钟节拍数
   * @param totalBeats 总节拍数（到达后自动停止）
   * @param onBeat 每次节拍的回调
   * @param onComplete 全部节拍完成回调
   */
  startMetronome(
    bpm: number,
    totalBeats: number,
    onBeat?: BeatCallback,
    onComplete?: () => void
  ): void {
    this.init()
    this.resume()
    this.stopMetronome()

    this.metronomeBeatCount = 0
    this.isMetronomeRunning = true

    const intervalMs = (60 / bpm) * 1000
    if (!isFinite(intervalMs) || intervalMs <= 0) {
      console.warn('[soundEngine] 非法 BPM:', bpm)
      return
    }

    const tick = () => {
      if (!this.isMetronomeRunning) return

      this.metronomeBeatCount++
      const isAccent = this.metronomeBeatCount % 4 === 1
      this.playBeat(isAccent)

      onBeat?.(this.metronomeBeatCount)

      if (this.metronomeBeatCount >= totalBeats) {
        this.stopMetronome()
        onComplete?.()
        return
      }

      this.metronomeTimer = window.setTimeout(tick, intervalMs)
    }

    // 立即触发第一拍
    tick()
  }

  /**
   * 停止节拍器
   */
  stopMetronome(): void {
    this.isMetronomeRunning = false
    if (this.metronomeTimer !== null) {
      clearTimeout(this.metronomeTimer)
      this.metronomeTimer = null
    }
    this.metronomeBeatCount = 0
  }

  /**
   * 节拍器是否运行中
   */
  get metronomeRunning(): boolean {
    return this.isMetronomeRunning
  }

  /**
   * 获取当前节拍数
   */
  get currentBeatCount(): number {
    return this.metronomeBeatCount
  }

  /**
   * 命运格触发音效（神秘音）
   */
  playChanceTrigger(): void {
    this.init()
    this.resume()
    this.playTone(300, 0.15, 'sawtooth', 0.3)
    this.registerTimer(() => this.playTone(350, 0.15, 'sawtooth', 0.3), 100)
    this.registerTimer(() => this.playTone(400, 0.2, 'sawtooth', 0.3), 200)
  }

  /**
   * 胜利通关音效（欢快上升旋律）
   */
  playVictory(): void {
    this.init()
    this.resume()
    const notes = [
      { freq: 523, delay: 0 },    // C5
      { freq: 659, delay: 150 },   // E5
      { freq: 784, delay: 300 },   // G5
      { freq: 1047, delay: 450 },  // C6
      { freq: 1319, delay: 600 },  // E6
    ]
    notes.forEach(({ freq, delay }) => {
      this.registerTimer(() => this.playTone(freq, 0.3, 'triangle', 0.4), delay)
    })
  }

  /**
   * 高潮蓄势音效：频率持续上升的扫频，制造临界点逼近感
   * @param duration 蓄势时长（秒）
   */
  playClimaxBuildup(duration: number = 4): void {
    if (!this.enabled) return
    this.init()
    this.resume()
    if (!this.audioContext || !this.masterGain) return

    const now = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    osc.type = 'sawtooth'
    // 从 80Hz 指数上升至 800Hz
    osc.frequency.setValueAtTime(80, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + duration)

    // 音量渐强
    gain.gain.setValueAtTime(0.01, now)
    gain.gain.exponentialRampToValueAtTime(0.15, now + duration * 0.8)
    // 最后 20% 急速上升
    gain.gain.exponentialRampToValueAtTime(0.3, now + duration)

    // 低通滤波器扫频（从闷到亮）
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(200, now)
    filter.frequency.exponentialRampToValueAtTime(4000, now + duration)
    filter.Q.value = 8

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + duration + 0.1)
  }

  /**
   * 高潮释放音效：低频冲击 + 高频闪烁 + 长尾衰减
   */
  playClimaxRelease(): void {
    if (!this.enabled) return
    this.init()
    this.resume()
    if (!this.audioContext || !this.masterGain) return

    const now = this.audioContext.currentTime

    // 1. 低频冲击（sub-bass thump）
    const subOsc = this.audioContext.createOscillator()
    const subGain = this.audioContext.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(120, now)
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.8)
    subGain.gain.setValueAtTime(0.5, now)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
    subOsc.connect(subGain)
    subGain.connect(this.masterGain)
    subOsc.start(now)
    subOsc.stop(now + 1.5)

    // 2. 高频闪烁（白噪声 burst）
    const bufferSize = this.audioContext.sampleRate * 0.5
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    }
    const noise = this.audioContext.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseGain = this.audioContext.createGain()
    const noiseFilter = this.audioContext.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.value = 2000
    noiseGain.gain.setValueAtTime(0.2, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain)
    noise.start(now)

    // 3. 上升和弦（C major 爆发）
    const chordFreqs = [523, 659, 784, 1047] // C5 E5 G5 C6
    chordFreqs.forEach((freq) => {
      this.playTone(freq, 1.5, 'triangle', 0.25)
    })

    // 4. 延迟的余韵音（2秒后柔和衰减）
    this.registerTimer(() => {
      this.playTone(1047, 2, 'sine', 0.15) // C6 长尾
      this.playTone(1319, 2, 'sine', 0.1)  // E6 长尾
    }, 800)
  }

  /**
   * 道具使用音效
   */
  playItemUse(): void {
    this.init()
    this.resume()
    this.playTone(600, 0.1, 'triangle', 0.3)
    this.registerTimer(() => this.playTone(900, 0.15, 'triangle', 0.3), 80)
  }

  /**
   * 错误/惩罚音效
   */
  playError(): void {
    this.init()
    this.resume()
    this.playTone(200, 0.2, 'sawtooth', 0.4)
    this.registerTimer(() => this.playTone(150, 0.3, 'sawtooth', 0.4), 100)
  }

  /**
   * 启动环境氛围音（低频 pad + LFO 颤动）
   * 在撸动事件弹窗打开时调用，营造沉浸氛围。
   */
  startAmbient(): void {
    if (!this.enabled) return
    this.init()
    this.resume()
    if (this.ambientOsc) return // 已在运行

    if (!this.audioContext || !this.masterGain) return

    // 主低频振荡器（80Hz sine）
    this.ambientOsc = this.audioContext.createOscillator()
    this.ambientOsc.type = 'sine'
    this.ambientOsc.frequency.value = 80

    // 第二振荡器（120Hz，产生拍频效果）
    this.ambientOsc2 = this.audioContext.createOscillator()
    this.ambientOsc2.type = 'sine'
    this.ambientOsc2.frequency.value = 120

    // LFO 调制（缓慢颤动 0.3Hz）
    this.lfoNode = this.audioContext.createOscillator()
    this.lfoGain = this.audioContext.createGain()
    this.lfoNode.frequency.value = 0.3
    this.lfoGain.gain.value = 15
    this.lfoNode.connect(this.lfoGain)
    this.lfoGain.connect(this.ambientOsc.frequency)

    // 淡入
    this.ambientGain = this.audioContext.createGain()
    this.ambientGain.gain.setValueAtTime(0, this.audioContext.currentTime)
    this.ambientGain.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 2)

    // 低通滤波器（柔化音色）
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400

    this.ambientOsc.connect(filter)
    this.ambientOsc2.connect(filter)
    filter.connect(this.ambientGain)
    this.ambientGain.connect(this.masterGain)

    this.ambientOsc.start()
    this.ambientOsc2.start()
    this.lfoNode.start()
  }

  /**
   * 停止环境氛围音（淡出后断开）
   */
  stopAmbient(): void {
    if (!this.audioContext || !this.ambientGain) {
      this.cleanupAmbient()
      return
    }
    const now = this.audioContext.currentTime
    this.ambientGain.gain.cancelScheduledValues(now)
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now)
    this.ambientGain.gain.linearRampToValueAtTime(0, now + 1)

    // 1 秒后清理节点（注册到 soundTimers 以便 destroy 时统一清理）
    this.registerTimer(() => this.cleanupAmbient(), 1100)
  }

  /** 清理环境音节点 */
  private cleanupAmbient(): void {
    try {
      this.ambientOsc?.stop()
      this.ambientOsc2?.stop()
      this.lfoNode?.stop()
    } catch {
      // 已停止
    }
    this.ambientOsc?.disconnect()
    this.ambientOsc2?.disconnect()
    this.lfoNode?.disconnect()
    this.lfoGain?.disconnect()
    this.ambientOsc = null
    this.ambientOsc2 = null
    this.lfoNode = null
    this.lfoGain = null
    this.ambientGain = null
  }

  /**
   * 销毁音频上下文，释放资源
   */
  destroy(): void {
    this.stopMetronome()
    this.stopAmbient()
    this.clearAllSoundTimers()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
      this.masterGain = null
    }
  }
}

/** 全局单例音频引擎 */
export const soundEngine = new SoundEngine()
