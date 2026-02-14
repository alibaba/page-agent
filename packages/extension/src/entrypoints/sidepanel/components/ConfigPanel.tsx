import { Copy, CornerUpLeft, Eye, EyeOff, HatGlasses, Home, Loader2, Scale } from 'lucide-react'
import { useEffect, useState } from 'react'
import { siGithub } from 'simple-icons'

import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '@/agent/constants'
import type { ExtConfig, LanguagePreference } from '@/agent/useAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConfigPanelProps {
	config: ExtConfig | null
	onSave: (config: ExtConfig) => Promise<void>
	onClose: () => void
}

export function ConfigPanel({ config, onSave, onClose }: ConfigPanelProps) {
	const [apiKey, setApiKey] = useState(config?.apiKey || DEMO_API_KEY)
	const [baseURL, setBaseURL] = useState(config?.baseURL || DEMO_BASE_URL)
	const [model, setModel] = useState(config?.model || DEMO_MODEL)
	const [language, setLanguage] = useState<LanguagePreference>(config?.language)
	const [saving, setSaving] = useState(false)
	const [userAuthToken, setUserAuthToken] = useState<string>('')
	const [copied, setCopied] = useState(false)
	const [showToken, setShowToken] = useState(false)
	const [showApiKey, setShowApiKey] = useState(false)

	// Update local state when config prop changes
	useEffect(() => {
		setApiKey(config?.apiKey || DEMO_API_KEY)
		setBaseURL(config?.baseURL || DEMO_BASE_URL)
		setModel(config?.model || DEMO_MODEL)
		setLanguage(config?.language)
	}, [config])

	// Poll for user auth token every second until found
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null

		const fetchToken = async () => {
			const result = await chrome.storage.local.get('PageAgentExtUserAuthToken')
			const token = result.PageAgentExtUserAuthToken
			if (typeof token === 'string' && token) {
				setUserAuthToken(token)
				if (interval) {
					clearInterval(interval)
					interval = null
				}
			}
		}

		fetchToken()
		interval = setInterval(fetchToken, 1000)

		return () => {
			if (interval) clearInterval(interval)
		}
	}, [])

	const handleCopyToken = async () => {
		if (userAuthToken) {
			await navigator.clipboard.writeText(userAuthToken)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			await onSave({ apiKey, baseURL, model, language })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex flex-col gap-4 p-4 relative">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold">Settings</h2>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					className="absolute top-2 right-3 cursor-pointer"
				>
					<CornerUpLeft className="size-3.5" />
				</Button>
			</div>

			{/* User Auth Token Section */}
			<div className="flex flex-col gap-1.5 p-3 bg-muted/50 rounded-md border">
				<label className="text-xs font-medium text-muted-foreground">User Auth Token</label>
				<p className="text-[10px] text-muted-foreground mb-1">
					Add this token to a website's localStorage to give it authorization to call this extension
				</p>
				<div className="flex gap-2 items-center">
					<Input
						readOnly
						value={
							userAuthToken
								? showToken
									? userAuthToken
									: `${userAuthToken.slice(0, 4)}${'•'.repeat(userAuthToken.length - 8)}${userAuthToken.slice(-4)}`
								: 'Loading...'
						}
						className="text-xs h-8 font-mono bg-background"
					/>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 cursor-pointer"
						onClick={() => setShowToken(!showToken)}
						disabled={!userAuthToken}
					>
						{showToken ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 cursor-pointer"
						onClick={handleCopyToken}
						disabled={!userAuthToken}
					>
						{copied ? <span className="">✓</span> : <Copy className="size-3" />}
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">Base URL</label>
				<Input
					placeholder="https://api.openai.com/v1"
					value={baseURL}
					onChange={(e) => setBaseURL(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">Model</label>
				<Input
					placeholder="gpt-5.2"
					value={model}
					onChange={(e) => setModel(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">API Key</label>
				<div className="flex gap-2 items-center">
					<Input
						type={showApiKey ? 'text' : 'password'}
						placeholder="sk-..."
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						className="text-xs h-8"
					/>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 cursor-pointer"
						onClick={() => setShowApiKey(!showApiKey)}
					>
						{showApiKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">Language</label>
				<select
					value={language ?? ''}
					onChange={(e) => setLanguage((e.target.value || undefined) as LanguagePreference)}
					className="h-8 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
				>
					<option value="">System</option>
					<option value="en-US">English</option>
					<option value="zh-CN">中文</option>
				</select>
			</div>

			<div className="flex gap-2 mt-2">
				<Button variant="outline" onClick={onClose} className="flex-1 h-8 text-xs cursor-pointer">
					Cancel
				</Button>
				<Button
					onClick={handleSave}
					disabled={saving}
					className="flex-1 h-8 text-xs cursor-pointer"
				>
					{saving ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
				</Button>
			</div>

			{/* Footer */}
			<div className="mt-4 mb-4 pt-4 border-t border-border/50 flex gap-2 justify-between text-[10px] text-muted-foreground">
				<div className="flex flex-col justify-between">
					<a
						href="https://github.com/alibaba/page-agent"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-foreground"
					>
						<svg role="img" viewBox="0 0 24 24" className="size-3 fill-current">
							<path d={siGithub.path} />
						</svg>
						<span>Source Code</span>
					</a>

					<a
						href="https://alibaba.github.io/page-agent/"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-foreground"
					>
						<Home className="size-3" />
						<span>Home Page</span>
					</a>

					<a
						href="https://github.com/alibaba/page-agent/blob/main/packages/extension/PRIVACY.md"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-foreground"
					>
						<HatGlasses className="size-3" />
						<span>Privacy Policy</span>
					</a>
				</div>

				<div className="flex flex-col items-end">
					<span>
						Extension <span className="font-mono">v{__EXT_VERSION__}</span>
					</span>
					<span>
						PageAgent <span className="font-mono">v{__CORE_VERSION__}</span>
					</span>
				</div>
			</div>

			{/* attribute */}
			<div className="text-[10px] text-muted-foreground bg-background fixed bottom-0 w-full flex justify-around">
				<span className="leading-loose">
					Built with ♥️ by{' '}
					<a
						href="https://github.com/gaomeng1900"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-foreground"
					>
						@Simon
					</a>
				</span>
			</div>
		</div>
	)
}
