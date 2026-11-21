import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Mafia ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-red-500 dark:text-red-400 font-mono mt-2 break-words">
                {this.state.error?.toString()}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Mafia</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
