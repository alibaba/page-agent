import { AlertTriangle, Eraser, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null }

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('[ErrorBoundary]', error, errorInfo.componentStack)
	}

	handleReload = () => {
		window.location.reload()
	}

	handleResetConfig = async () => {
		await chrome.storage.local.remove(['llmConfig', 'language', 'advancedConfig'])
		window.location.reload()
	}

	render() {
		if (!this.state.hasError) {
			return this.props.children
		}

		return (
			<div className="flex flex-col items-center justify-center h-screen bg-background p-6 text-center">
				<AlertTriangle className="size-12 text-destructive mb-4" />
				<h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
				<p className="text-sm text-muted-foreground mb-4 max-w-xs">
					{this.state.error?.message || 'An unexpected error occurred'}
				</p>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={this.handleResetConfig}>
						<Eraser className="size-3.5 mr-2" />
						Reset Config
					</Button>
					<Button variant="outline" size="sm" onClick={this.handleReload}>
						<RotateCcw className="size-3.5 mr-2" />
						Reload Panel
					</Button>
				</div>
			</div>
		)
	}
}
