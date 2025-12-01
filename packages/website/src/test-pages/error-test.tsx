import { useState } from 'react'
import { Link } from 'wouter'

interface ErrorScenario {
	id: string
	title: string
	description: string
	type: 'network' | 'validation' | 'permission' | 'timeout' | 'server'
}

export default function ErrorTestPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [retryCount, setRetryCount] = useState(0)
	const [formData, setFormData] = useState({
		username: '',
		password: '',
		email: '',
		file: null as File | null,
	})

	const errorScenarios: ErrorScenario[] = [
		{
			id: 'network-error',
			title: '网络连接错误',
			description: '模拟网络连接失败，测试重试机制',
			type: 'network',
		},
		{
			id: 'validation-error',
			title: '表单验证错误',
			description: '模拟表单验证失败，测试错误提示',
			type: 'validation',
		},
		{
			id: 'permission-error',
			title: '权限不足错误',
			description: '模拟权限验证失败，测试权限处理',
			type: 'permission',
		},
		{
			id: 'timeout-error',
			title: '请求超时错误',
			description: '模拟请求超时，测试超时处理',
			type: 'timeout',
		},
		{
			id: 'server-error',
			title: '服务器内部错误',
			description: '模拟服务器500错误，测试错误恢复',
			type: 'server',
		},
	]

	const simulateError = async (scenario: ErrorScenario): Promise<void> => {
		setIsLoading(true)
		setError(null)
		setSuccess(null)

		// 模拟网络延迟
		await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

		switch (scenario.type) {
			case 'network':
				// 70% 概率失败
				if (Math.random() < 0.7) {
					throw new Error('网络连接失败：无法连接到服务器，请检查您的网络连接')
				}
				break

			case 'validation':
				// 检查表单数据
				if (!formData.username || formData.username.length < 3) {
					throw new Error('用户名验证失败：用户名至少需要3个字符')
				}
				if (!formData.password || formData.password.length < 6) {
					throw new Error('密码验证失败：密码至少需要6个字符')
				}
				if (!formData.email?.includes('@')) {
					throw new Error('邮箱验证失败：请输入有效的邮箱地址')
				}
				break

			case 'permission':
				// 模拟权限检查
				if (formData.username !== 'admin') {
					throw new Error('权限不足：您没有执行此操作的权限，请联系管理员')
				}
				break

			case 'timeout':
				// 模拟超时
				await new Promise((resolve) => setTimeout(resolve, 8000))
				throw new Error('请求超时：服务器响应时间过长，请稍后重试')

			case 'server':
				// 50% 概率服务器错误
				if (Math.random() < 0.5) {
					throw new Error('服务器内部错误：服务器遇到了一个错误，请稍后重试')
				}
				break

			default:
				throw new Error('未知错误：发生了未预期的错误')
		}

		// 成功情况
		return Promise.resolve()
	}

	const handleScenarioTest = async (scenario: ErrorScenario) => {
		try {
			await simulateError(scenario)
			setSuccess(`${scenario.title} 测试成功完成！`)
			setRetryCount(0)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : '未知错误'
			setError(errorMessage)
			setRetryCount((prev) => prev + 1)
		} finally {
			setIsLoading(false)
		}
	}

	const handleRetry = async (scenario: ErrorScenario) => {
		if (retryCount >= 3) {
			setError('重试次数已达上限，请稍后再试或联系技术支持')
			return
		}
		await handleScenarioTest(scenario)
	}

	const handleFileUpload = async () => {
		if (!formData.file) {
			setError('请选择要上传的文件')
			return
		}

		setIsLoading(true)
		setError(null)
		setSuccess(null)

		try {
			// 模拟文件大小检查
			if (formData.file.size > 5 * 1024 * 1024) {
				throw new Error('文件上传失败：文件大小不能超过5MB')
			}

			// 模拟文件类型检查
			const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
			if (!allowedTypes.includes(formData.file.type)) {
				throw new Error('文件上传失败：不支持的文件类型，请上传图片或PDF文件')
			}

			// 模拟上传过程
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// 模拟随机失败
			if (Math.random() < 0.3) {
				throw new Error('文件上传失败：上传过程中发生错误，请重试')
			}

			setSuccess('文件上传成功！')
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : '文件上传失败'
			setError(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}

	const clearMessages = () => {
		setError(null)
		setSuccess(null)
		setRetryCount(0)
	}

	const getErrorIcon = (type: string) => {
		switch (type) {
			case 'network':
				return '🌐'
			case 'validation':
				return '⚠️'
			case 'permission':
				return '🔒'
			case 'timeout':
				return '⏰'
			case 'server':
				return '🔧'
			default:
				return '❌'
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
			<div className="max-w-4xl mx-auto px-4">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">错误处理测试</h1>
					<p className="text-gray-600 dark:text-gray-300">
						测试各种错误场景和重试机制，验证 Agent 的错误处理能力
					</p>
				</div>

				{/* 全局消息显示 */}
				{(error || success) && (
					<div className="mb-8">
						{error && (
							<div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
								<div className="flex items-start">
									<div className="shrink-0">
										<svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<div className="ml-3 flex-1">
										<h3 className="text-sm font-medium text-red-800 dark:text-red-200">操作失败</h3>
										<p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
										{retryCount > 0 && (
											<p className="mt-2 text-xs text-red-600 dark:text-red-400">
												已重试 {retryCount} 次 {retryCount >= 3 && '(已达最大重试次数)'}
											</p>
										)}
									</div>
									<button
										onClick={clearMessages}
										className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300"
									>
										<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
											<path
												fillRule="evenodd"
												d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
												clipRule="evenodd"
											/>
										</svg>
									</button>
								</div>
							</div>
						)}

						{success && (
							<div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
								<div className="flex items-start">
									<div className="shrink-0">
										<svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<div className="ml-3 flex-1">
										<h3 className="text-sm font-medium text-green-800 dark:text-green-200">
											操作成功
										</h3>
										<p className="mt-1 text-sm text-green-700 dark:text-green-300">{success}</p>
									</div>
									<button
										onClick={clearMessages}
										className="ml-3 text-green-400 hover:text-green-600 dark:hover:text-green-300"
									>
										<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
											<path
												fillRule="evenodd"
												d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
												clipRule="evenodd"
											/>
										</svg>
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* 错误场景测试 */}
					<div className="space-y-6">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white">错误场景测试</h2>

						{errorScenarios.map((scenario) => (
							<div key={scenario.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
								<div className="flex items-start space-x-4">
									<div className="text-3xl">{getErrorIcon(scenario.type)}</div>
									<div className="flex-1">
										<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
											{scenario.title}
										</h3>
										<p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
											{scenario.description}
										</p>
										<div className="flex space-x-3">
											<button
												onClick={() => handleScenarioTest(scenario)}
												disabled={isLoading}
												className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md transition-colors text-sm"
											>
												{isLoading ? '测试中...' : '触发错误'}
											</button>
											{error && retryCount > 0 && retryCount < 3 && (
												<button
													onClick={() => handleRetry(scenario)}
													disabled={isLoading}
													className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors text-sm"
												>
													重试 ({retryCount}/3)
												</button>
											)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* 表单验证测试 */}
					<div className="space-y-6">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white">表单验证测试</h2>

						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
								用户信息表单
							</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										用户名 (至少3个字符)
									</label>
									<input
										type="text"
										value={formData.username}
										onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
										placeholder="请输入用户名"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										密码 (至少6个字符)
									</label>
									<input
										type="password"
										value={formData.password}
										onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
										placeholder="请输入密码"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										邮箱地址
									</label>
									<input
										type="email"
										value={formData.email}
										onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
										placeholder="请输入邮箱地址"
									/>
								</div>
								<button
									onClick={() =>
										handleScenarioTest(errorScenarios.find((s) => s.type === 'validation')!)
									}
									disabled={isLoading}
									className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors"
								>
									{isLoading ? '验证中...' : '提交表单'}
								</button>
							</div>
						</div>

						{/* 文件上传测试 */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
								文件上传测试
							</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										选择文件 (最大5MB，支持图片和PDF)
									</label>
									<input
										type="file"
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, file: e.target.files?.[0] || null }))
										}
										accept="image/*,.pdf"
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
									/>
								</div>
								{formData.file && (
									<div className="text-sm text-gray-600 dark:text-gray-300">
										已选择: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)}{' '}
										MB)
									</div>
								)}
								<button
									onClick={handleFileUpload}
									disabled={isLoading || !formData.file}
									className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors"
								>
									{isLoading ? '上传中...' : '上传文件'}
								</button>
							</div>
						</div>

						{/* 权限测试说明 */}
						<div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
							<h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
								💡 权限测试提示
							</h4>
							<p className="text-sm text-yellow-700 dark:text-yellow-300">
								要通过权限测试，请在用户名字段输入 "admin"，然后点击"触发错误"按钮测试权限验证。
							</p>
						</div>
					</div>
				</div>

				{/* 加载状态指示器 */}
				{isLoading && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-4">
							<svg
								className="animate-spin h-8 w-8 text-blue-600"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span className="text-gray-900 dark:text-white">处理中，请稍候...</span>
						</div>
					</div>
				)}

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
