import { useEffect, useState } from 'react'
import { Link } from 'wouter'

interface UploadProgress {
	id: string
	name: string
	progress: number
	status: 'uploading' | 'completed' | 'error'
	speed: string
	timeRemaining: string
}

interface DataItem {
	id: number
	title: string
	content: string
	timestamp: string
	status: 'loading' | 'loaded' | 'error'
}

export default function AsyncTestPage() {
	const [uploads, setUploads] = useState<UploadProgress[]>([])
	const [dataItems, setDataItems] = useState<DataItem[]>([])
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [realTimeData, setRealTimeData] = useState<string[]>([])
	const [isRealTimeActive, setIsRealTimeActive] = useState(false)
	const [longRunningTask, setLongRunningTask] = useState<{
		isRunning: boolean
		progress: number
		currentStep: string
		logs: string[]
	}>({
		isRunning: false,
		progress: 0,
		currentStep: '',
		logs: [],
	})

	// 模拟实时数据更新
	useEffect(() => {
		let interval: NodeJS.Timeout
		if (isRealTimeActive) {
			interval = setInterval(() => {
				const newData = `数据更新 ${new Date().toLocaleTimeString()}: ${Math.floor(Math.random() * 1000)}`
				setRealTimeData((prev) => [newData, ...prev.slice(0, 9)]) // 保持最新10条
			}, 2000)
		}
		return () => {
			if (interval) clearInterval(interval)
		}
	}, [isRealTimeActive])

	// 模拟文件上传
	const simulateFileUpload = (fileName: string) => {
		const uploadId = Date.now().toString()
		const newUpload: UploadProgress = {
			id: uploadId,
			name: fileName,
			progress: 0,
			status: 'uploading',
			speed: '0 KB/s',
			timeRemaining: '计算中...',
		}

		setUploads((prev) => [...prev, newUpload])

		// 模拟上传进度
		const interval = setInterval(() => {
			setUploads((prev) =>
				prev.map((upload) => {
					if (upload.id === uploadId) {
						const newProgress = Math.min(upload.progress + Math.random() * 15, 100)
						const speed = `${(Math.random() * 500 + 100).toFixed(0)} KB/s`
						const timeRemaining =
							newProgress >= 100 ? '完成' : `${Math.ceil((100 - newProgress) / 10)}秒`

						// 模拟随机失败
						if (newProgress > 50 && Math.random() < 0.1) {
							clearInterval(interval)
							return {
								...upload,
								status: 'error' as const,
								speed: '0 KB/s',
								timeRemaining: '失败',
							}
						}

						if (newProgress >= 100) {
							clearInterval(interval)
							return {
								...upload,
								progress: 100,
								status: 'completed' as const,
								speed,
								timeRemaining,
							}
						}

						return {
							...upload,
							progress: newProgress,
							speed,
							timeRemaining,
						}
					}
					return upload
				})
			)
		}, 500)
	}

	// 模拟数据加载
	const loadData = async () => {
		setIsLoadingData(true)
		setDataItems([])

		// 创建骨架屏数据
		const skeletonItems: DataItem[] = Array.from({ length: 6 }, (_, i) => ({
			id: i,
			title: '',
			content: '',
			timestamp: '',
			status: 'loading',
		}))
		setDataItems(skeletonItems)

		// 逐个加载数据项
		for (let i = 0; i < 6; i++) {
			await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000))

			setDataItems((prev) =>
				prev.map((item) => {
					if (item.id === i) {
						// 模拟随机加载失败
						if (Math.random() < 0.15) {
							return {
								...item,
								status: 'error',
								title: '加载失败',
								content: '数据加载失败，请重试',
							}
						}

						return {
							...item,
							status: 'loaded',
							title: `数据项 ${i + 1}`,
							content: `这是第 ${i + 1} 个数据项的内容，包含了一些示例文本用于展示加载效果。`,
							timestamp: new Date().toLocaleString(),
						}
					}
					return item
				})
			)
		}

		setIsLoadingData(false)
	}

	// 模拟长时间运行的任务
	const startLongRunningTask = async () => {
		setLongRunningTask({
			isRunning: true,
			progress: 0,
			currentStep: '初始化任务...',
			logs: ['任务开始'],
		})

		const steps = [
			{ name: '初始化任务...', duration: 2000 },
			{ name: '连接服务器...', duration: 1500 },
			{ name: '验证权限...', duration: 1000 },
			{ name: '下载数据...', duration: 3000 },
			{ name: '处理数据...', duration: 2500 },
			{ name: '生成报告...', duration: 2000 },
			{ name: '保存结果...', duration: 1000 },
			{ name: '清理资源...', duration: 500 },
		]

		for (let i = 0; i < steps.length; i++) {
			const step = steps[i]

			setLongRunningTask((prev) => ({
				...prev,
				currentStep: step.name,
				logs: [...prev.logs, `开始: ${step.name}`],
			}))

			// 模拟步骤执行时间
			const startTime = Date.now()
			while (Date.now() - startTime < step.duration) {
				await new Promise((resolve) => setTimeout(resolve, 100))
				const elapsed = Date.now() - startTime
				const stepProgress = Math.min((elapsed / step.duration) * 100, 100)
				const totalProgress = ((i + stepProgress / 100) / steps.length) * 100

				setLongRunningTask((prev) => ({
					...prev,
					progress: totalProgress,
				}))
			}

			setLongRunningTask((prev) => ({
				...prev,
				logs: [...prev.logs, `完成: ${step.name}`],
			}))

			// 模拟随机失败
			if (i === 3 && Math.random() < 0.2) {
				setLongRunningTask((prev) => ({
					...prev,
					isRunning: false,
					currentStep: '任务失败',
					logs: [...prev.logs, '错误: 数据下载失败，请重试'],
				}))
				return
			}
		}

		setLongRunningTask((prev) => ({
			...prev,
			isRunning: false,
			progress: 100,
			currentStep: '任务完成',
			logs: [...prev.logs, '任务成功完成！'],
		}))
	}

	const clearUploads = () => {
		setUploads([])
	}

	const retryFailedUpload = (uploadId: string) => {
		const failedUpload = uploads.find((u) => u.id === uploadId)
		if (failedUpload) {
			setUploads((prev) => prev.filter((u) => u.id !== uploadId))
			simulateFileUpload(failedUpload.name)
		}
	}

	const retryDataLoad = (itemId: number) => {
		setDataItems((prev) =>
			prev.map((item) => {
				if (item.id === itemId) {
					return { ...item, status: 'loading', title: '', content: '', timestamp: '' }
				}
				return item
			})
		)

		setTimeout(() => {
			setDataItems((prev) =>
				prev.map((item) => {
					if (item.id === itemId) {
						return {
							...item,
							status: 'loaded',
							title: `数据项 ${itemId + 1}`,
							content: `这是重新加载的第 ${itemId + 1} 个数据项的内容。`,
							timestamp: new Date().toLocaleString(),
						}
					}
					return item
				})
			)
		}, 1000)
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
			<div className="max-w-6xl mx-auto px-4">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">异步操作测试</h1>
					<p className="text-gray-600 dark:text-gray-300">
						测试等待、加载状态识别和异步操作处理能力
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* 文件上传进度 */}
					<div className="space-y-6">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
									文件上传进度
								</h2>
								<div className="space-x-2">
									<button
										type="button"
										onClick={() => simulateFileUpload(`文件_${Date.now()}.pdf`)}
										className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
									>
										开始上传
									</button>
									<button
										type="button"
										onClick={clearUploads}
										className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
									>
										清空列表
									</button>
								</div>
							</div>

							<div className="space-y-4">
								{uploads.length === 0 ? (
									<div className="text-center py-8 text-gray-500 dark:text-gray-400">
										点击"开始上传"来模拟文件上传
									</div>
								) : (
									uploads.map((upload) => (
										<div
											key={upload.id}
											className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
										>
											<div className="flex justify-between items-center mb-2">
												<span className="font-medium text-gray-900 dark:text-white">
													{upload.name}
												</span>
												<span
													className={`text-sm ${
														upload.status === 'completed'
															? 'text-green-600 dark:text-green-400'
															: upload.status === 'error'
																? 'text-red-600 dark:text-red-400'
																: 'text-blue-600 dark:text-blue-400'
													}`}
												>
													{upload.status === 'completed'
														? '✓ 完成'
														: upload.status === 'error'
															? '✗ 失败'
															: '上传中...'}
												</span>
											</div>

											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
												<div
													className={`h-2 rounded-full transition-all duration-300 ${
														upload.status === 'completed'
															? 'bg-green-500'
															: upload.status === 'error'
																? 'bg-red-500'
																: 'bg-blue-500'
													}`}
													style={{ width: `${upload.progress}%` }}
												/>
											</div>

											<div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
												<span>{upload.progress.toFixed(1)}%</span>
												<span>{upload.speed}</span>
												<span>{upload.timeRemaining}</span>
											</div>

											{upload.status === 'error' && (
												<button
													type="button"
													onClick={() => retryFailedUpload(upload.id)}
													className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
												>
													重试上传
												</button>
											)}
										</div>
									))
								)}
							</div>
						</div>

						{/* 实时数据更新 */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
									实时数据更新
								</h2>
								<button
									type="button"
									onClick={() => setIsRealTimeActive(!isRealTimeActive)}
									className={`px-4 py-2 rounded-md transition-colors text-sm ${
										isRealTimeActive
											? 'bg-red-600 hover:bg-red-700 text-white'
											: 'bg-green-600 hover:bg-green-700 text-white'
									}`}
								>
									{isRealTimeActive ? '停止更新' : '开始更新'}
								</button>
							</div>

							<div className="space-y-2 max-h-64 overflow-y-auto">
								{realTimeData.length === 0 ? (
									<div className="text-center py-8 text-gray-500 dark:text-gray-400">
										点击"开始更新"来查看实时数据
									</div>
								) : (
									realTimeData.map((data) => (
										<div
											key={data}
											className={`p-3 rounded-lg border transition-all duration-300 ${
												data === realTimeData[0]
													? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
													: 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
											}`}
										>
											<span className="text-sm text-gray-900 dark:text-white">{data}</span>
										</div>
									))
								)}
							</div>
						</div>
					</div>

					{/* 数据加载和长时间任务 */}
					<div className="space-y-6">
						{/* 数据加载骨架屏 */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
									数据加载测试
								</h2>
								<button
									type="button"
									onClick={loadData}
									disabled={isLoadingData}
									className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors text-sm"
								>
									{isLoadingData ? '加载中...' : '加载数据'}
								</button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{dataItems.map((item) => (
									<div
										key={item.id}
										className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
									>
										{item.status === 'loading' ? (
											<div className="animate-pulse">
												<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
												<div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full mb-1"></div>
												<div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
											</div>
										) : item.status === 'error' ? (
											<div>
												<h3 className="font-medium text-red-600 dark:text-red-400 mb-2">
													{item.title}
												</h3>
												<p className="text-sm text-red-500 dark:text-red-400 mb-2">
													{item.content}
												</p>
												<button
													type="button"
													onClick={() => retryDataLoad(item.id)}
													className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
												>
													重试
												</button>
											</div>
										) : (
											<div>
												<h3 className="font-medium text-gray-900 dark:text-white mb-2">
													{item.title}
												</h3>
												<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
													{item.content}
												</p>
												<span className="text-xs text-gray-500 dark:text-gray-400">
													{item.timestamp}
												</span>
											</div>
										)}
									</div>
								))}
							</div>
						</div>

						{/* 长时间运行任务 */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-white">长时间任务</h2>
								<button
									type="button"
									onClick={startLongRunningTask}
									disabled={longRunningTask.isRunning}
									className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-md transition-colors text-sm"
								>
									{longRunningTask.isRunning ? '执行中...' : '开始任务'}
								</button>
							</div>

							{longRunningTask.progress > 0 && (
								<div className="mb-4">
									<div className="flex justify-between items-center mb-2">
										<span className="text-sm font-medium text-gray-900 dark:text-white">
											{longRunningTask.currentStep}
										</span>
										<span className="text-sm text-gray-600 dark:text-gray-300">
											{longRunningTask.progress.toFixed(1)}%
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
										<div
											className="bg-purple-500 h-2 rounded-full transition-all duration-300"
											style={{ width: `${longRunningTask.progress}%` }}
										/>
									</div>
								</div>
							)}

							{longRunningTask.logs.length > 0 && (
								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
									<h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
										执行日志:
									</h4>
									<div className="space-y-1">
										{longRunningTask.logs.map((log, logIdx) => {
											const logKey = `${logIdx + 1}-${log.substring(0, 30)}`
											return (
												<div
													key={logKey}
													className="text-sm text-gray-600 dark:text-gray-300 font-mono"
												>
													{log}
												</div>
											)
										})}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* 返回链接 */}
				<div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
					<Link href="/" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
						← 返回测试页面列表
					</Link>
				</div>
			</div>
		</div>
	)
}
