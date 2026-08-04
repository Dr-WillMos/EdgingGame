/**
 * 错误边界组件
 * ========================================
 * 捕获子组件树中的运行时错误，防止整个应用白屏。
 * 出错时显示友好的错误提示和"返回首页"按钮。
 */

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] 捕获到错误:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    // 使用 replaceState 避免刷新页面，保持 SPA 状态
    window.history.replaceState(null, '', '/')
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-board-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-neon-red mb-2">
              游戏出了点问题
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold btn-cyber transition-all"
            >
              返回首页
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
