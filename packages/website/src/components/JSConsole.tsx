/**
 * JS 调试台，适合在文档中直接让用户运行代码，并且实时查看运行结果
 */
/* eslint-disable @typescript-eslint/no-base-to-string */
import { KeyboardEvent, useEffect, useImperativeHandle, useRef, useState } from 'react'

import HighlightSyntax from './HighlightSyntax'

import styles from './JSConsole.module.css'

// 全局console拦截管理器
class ConsoleInterceptor {
	private static instance: ConsoleInterceptor
	private subscribers = new Set<(type: string, args: unknown[]) => void>()
	private originalConsole: {
		log: typeof console.log
		warn: typeof console.warn
		error: typeof console.error
	}
	private isIntercepting = false

	private constructor() {
		this.originalConsole = {
			log: console.log.bind(console),
			warn: console.warn.bind(console),
			error: console.error.bind(console),
		}
	}

	static getInstance() {
		if (!ConsoleInterceptor.instance) {
			ConsoleInterceptor.instance = new ConsoleInterceptor()
		}
		return ConsoleInterceptor.instance
	}

	subscribe(callback: (type: string, args: unknown[]) => void) {
		this.subscribers.add(callback)
		this.startIntercepting()
	}

	unsubscribe(callback: (type: string, args: unknown[]) => void) {
		this.subscribers.delete(callback)
		if (this.subscribers.size === 0) {
			this.stopIntercepting()
		}
	}

	private startIntercepting() {
		if (this.isIntercepting) return

		this.isIntercepting = true

		console.log = (...args: unknown[]) => {
			this.originalConsole.log(...args)
			this.notifySubscribers('log', args)
		}

		console.warn = (...args: unknown[]) => {
			this.originalConsole.warn(...args)
			this.notifySubscribers('warn', args)
		}

		console.error = (...args: unknown[]) => {
			this.originalConsole.error(...args)
			this.notifySubscribers('error', args)
		}
	}

	private stopIntercepting() {
		if (!this.isIntercepting) return

		this.isIntercepting = false
		console.log = this.originalConsole.log
		console.warn = this.originalConsole.warn
		console.error = this.originalConsole.error
	}

	private notifySubscribers(type: string, args: unknown[]) {
		this.subscribers.forEach((callback) => {
			callback(type, args)
		})
	}
}

interface JSConsoleProps {
	context?: Record<string, unknown>
	height?: string
	onExecute?: (code: string, result: unknown) => void
	placeholder?: string
	ref?: React.Ref<JSConsoleRef>
}

export interface JSConsoleRef {
	executeCode: (code: string) => Promise<unknown>
	clear: () => void
	appendOutput: (content: string) => void
}

interface OutputItem {
	type: 'input' | 'output' | 'error' | 'log'
	content: string
	timestamp: number
}

const DEFAULT_CONTEXT = {}

function JSConsole({
	context = DEFAULT_CONTEXT,
	height = '400px',
	onExecute,
	placeholder = 'Enter JavaScript code...',
	ref,
}: JSConsoleProps) {
	const [input, setInput] = useState('')
	const [outputs, setOutputs] = useState<OutputItem[]>([])
	const [isExecuting, setIsExecuting] = useState(false)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const outputRef = useRef<HTMLDivElement>(null)

	// 持久的执行上下文，用于多轮对话共享作用域
	const executionContextRef = useRef<Record<string, unknown>>({})

	// 格式化结果
	const formatResult = (value: unknown): string => {
		if (value === null) return 'null'
		if (value === undefined) return 'undefined'
		if (typeof value === 'string') return `"${value}"`
		if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`
		if (typeof value === 'object') {
			try {
				return JSON.stringify(value, null, 2)
			} catch {
				return value.toString()
			}
		}
		return String(value)
	}

	// 全局console拦截处理
	useEffect(() => {
		const interceptor = ConsoleInterceptor.getInstance()

		const handleGlobalConsole = (type: string, args: unknown[]) => {
			const content = args.map((arg) => formatResult(arg)).join(' ')

			const outputItem: OutputItem = {
				type: type as any,
				content: content,
				timestamp: Date.now(),
			}

			setOutputs((prev) => [...prev, outputItem])

			// 自动滚动到底部
			setTimeout(() => {
				if (outputRef.current) {
					outputRef.current.scrollTop = outputRef.current.scrollHeight
				}
			}, 0)
		}

		interceptor.subscribe(handleGlobalConsole)

		return () => {
			interceptor.unsubscribe(handleGlobalConsole)
		}
	}, [])

	// 执行代码
	const executeCode = async (code: string): Promise<unknown> => {
		if (!code.trim()) return

		setIsExecuting(true)

		// 添加输入到输出
		const inputItem: OutputItem = {
			type: 'input',
			content: code,
			timestamp: Date.now(),
		}

		setOutputs((prev) => [...prev, inputItem])

		try {
			// 创建异步函数以支持 await
			const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

			// 合并外部上下文和持久执行上下文
			const allContext = { ...context, ...executionContextRef.current }
			const contextKeys = Object.keys(allContext)
			const contextValues = Object.values(allContext)

			// 注入 console.log 重定向
			const logs: string[] = []
			const mockConsole = {
				log: (...args: unknown[]) => {
					logs.push(args.map((arg) => formatResult(arg)).join(' '))
				},
				error: (...args: unknown[]) => {
					logs.push('ERROR: ' + args.map((arg) => formatResult(arg)).join(' '))
				},
				warn: (...args: unknown[]) => {
					logs.push('WARN: ' + args.map((arg) => formatResult(arg)).join(' '))
				},
			}

			// 检测代码是否是表达式还是语句
			const trimmedCode = code.trim()
			const isExpression =
				!trimmedCode.includes(';') &&
				!trimmedCode.startsWith('const ') &&
				!trimmedCode.startsWith('let ') &&
				!trimmedCode.startsWith('var ') &&
				!trimmedCode.startsWith('function ') &&
				!trimmedCode.startsWith('class ') &&
				!trimmedCode.startsWith('if ') &&
				!trimmedCode.startsWith('for ') &&
				!trimmedCode.startsWith('while ') &&
				!trimmedCode.startsWith('try ') &&
				!trimmedCode.startsWith('{') &&
				!trimmedCode.includes('\n')

			// 如果是表达式，自动添加 return
			const codeToExecute = isExpression ? `return ${code}` : code

			const wrappedCode = `
					return (async function() {
						${codeToExecute}
					})();
				`

			// 执行代码
			const func = new AsyncFunction('console', ...contextKeys, wrappedCode)
			const result = await func(mockConsole, ...contextValues)

			// 添加 console.log 输出
			if (logs.length > 0) {
				const logItem: OutputItem = {
					type: 'log',
					content: logs.join('\n'),
					timestamp: Date.now(),
				}
				setOutputs((prev) => [...prev, logItem])
			}

			// 总是添加执行结果输出（包括 undefined）
			const outputItem: OutputItem = {
				type: 'output',
				content: formatResult(result),
				timestamp: Date.now(),
			}
			setOutputs((prev) => [...prev, outputItem])

			onExecute?.(code, result)
			return result
		} catch (error) {
			const errorItem: OutputItem = {
				type: 'error',
				content: error instanceof Error ? error.message : String(error),
				timestamp: Date.now(),
			}
			setOutputs((prev) => [...prev, errorItem])
			throw error
		} finally {
			setIsExecuting(false)
			// 滚动到底部
			setTimeout(() => {
				if (outputRef.current) {
					outputRef.current.scrollTop = outputRef.current.scrollHeight
				}
			}, 0)
		}
	}

	// 清空控制台
	const clear = () => {
		setOutputs([])
		// 同时清空执行上下文
		executionContextRef.current = {}
	}

	// 添加输出
	const appendOutput = (content: string) => {
		const outputItem: OutputItem = {
			type: 'output',
			content,
			timestamp: Date.now(),
		}
		setOutputs((prev) => [...prev, outputItem])
	}

	// 暴露方法给父组件
	useImperativeHandle(ref, () => ({
		executeCode,
		clear,
		appendOutput,
	}))

	// 处理键盘事件
	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter') {
			if (e.shiftKey) {
				// Shift+Enter 换行
				return
			} else {
				// Enter 执行
				e.preventDefault()
				if (!isExecuting && input.trim()) {
					executeCode(input)
					setInput('')
					setTimeout(() => inputRef.current?.focus(), 0)
				}
			}
		}
	}

	function getPrompt(type: string) {
		let prompt = ' '
		if (type === 'input') {
			prompt = '>'
		} else if (type === 'output') {
			prompt = '<'
		}
		return prompt
	}

	return (
		<div className={styles.console} style={{ height }}>
			{/* 历史记录和输入区域 */}
			<div className={styles.historyArea} ref={outputRef}>
				{outputs.map((item) => (
					<div key={item.timestamp} className={`${styles.historyItem} ${styles[item.type]}`}>
						<span className={styles.prompt}>{getPrompt(item.type)}</span>
						<pre className={styles.content}>
							<HighlightSyntax code={item.content} />
						</pre>
					</div>
				))}
				{isExecuting && (
					<div className={styles.historyItem}>
						<span className={styles.prompt}>{'> '}</span>
						<span className={styles.executing}>Executing...</span>
					</div>
				)}
			</div>

			{/* 当前输入行 */}
			<div className={styles.inputArea}>
				<span className={styles.prompt}>{'> '}</span>
				<textarea
					ref={inputRef}
					className={styles.input}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={isExecuting}
					rows={1}
					style={{
						height: Math.min(Math.max(20, input.split('\n').length * 20), 120),
					}}
				/>
			</div>
		</div>
	)
}

export default JSConsole
