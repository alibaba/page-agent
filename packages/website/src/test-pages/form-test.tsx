import { useState } from 'react'
import { Link } from 'wouter'

interface FormData {
	username: string
	email: string
	password: string
	confirmPassword: string
	age: string
	birthDate: string
	phone: string
	website: string
	bio: string
	country: string
	newsletter: boolean
	terms: boolean
}

type FormErrors = Record<string, string>

export default function FormTestPage() {
	const [formData, setFormData] = useState<FormData>({
		username: '',
		email: '',
		password: '',
		confirmPassword: '',
		age: '',
		birthDate: '',
		phone: '',
		website: '',
		bio: '',
		country: '',
		newsletter: false,
		terms: false,
	})

	const [errors, setErrors] = useState<FormErrors>({})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)
	const [submitMessage, setSubmitMessage] = useState('')

	const validateField = (name: string, value: string | boolean): string => {
		switch (name) {
			case 'username':
				if (!value) return '用户名不能为空'
				if (typeof value === 'string' && value.length < 3) return '用户名至少需要3个字符'
				if (typeof value === 'string' && !/^[a-zA-Z0-9_]+$/.test(value))
					return '用户名只能包含字母、数字和下划线'
				return ''
			case 'email':
				if (!value) return '邮箱不能为空'
				if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
					return '请输入有效的邮箱地址'
				return ''
			case 'password':
				if (!value) return '密码不能为空'
				if (typeof value === 'string' && value.length < 6) return '密码至少需要6个字符'
				if (typeof value === 'string' && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value))
					return '密码必须包含大小写字母和数字'
				return ''
			case 'confirmPassword':
				if (!value) return '请确认密码'
				if (value !== formData.password) return '两次输入的密码不一致'
				return ''
			case 'age': {
				if (!value) return '年龄不能为空'
				const age = parseInt(value as string)
				if (isNaN(age) || age < 18 || age > 120) return '年龄必须在18-120之间'
				return ''
			}
			case 'phone':
				if (!value) return '手机号不能为空'
				if (typeof value === 'string' && !/^1[3-9]\d{9}$/.test(value)) return '请输入有效的手机号'
				return ''
			case 'terms':
				if (!value) return '请同意服务条款'
				return ''
			default:
				return ''
		}
	}

	const handleInputChange = (name: string, value: string | boolean) => {
		console.log(`Input changed: ${name} = ${value}`)

		setFormData((prev) => ({ ...prev, [name]: value }))

		// 实时验证
		const error = validateField(name, value)
		setErrors((prev) => ({ ...prev, [name]: error }))
	}

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {}
		let isValid = true

		Object.keys(formData).forEach((key) => {
			const error = validateField(key, formData[key as keyof FormData])
			if (error) {
				newErrors[key] = error
				isValid = false
			}
		})

		setErrors(newErrors)
		return isValid
	}

	const simulateSubmit = async (): Promise<{ success: boolean; message: string }> => {
		// 模拟网络延迟
		await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000))

		// 模拟随机失败
		if (Math.random() < 0.3) {
			throw new Error('网络错误：服务器暂时不可用，请稍后重试')
		}

		// 模拟服务器验证错误
		if (formData.username.toLowerCase() === 'admin') {
			throw new Error('用户名 "admin" 已被占用，请选择其他用户名')
		}

		return {
			success: true,
			message: '注册成功！欢迎加入我们的平台。',
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!validateForm()) {
			setSubmitResult('error')
			setSubmitMessage('请修正表单中的错误')
			return
		}

		setIsSubmitting(true)
		setSubmitResult(null)
		setSubmitMessage('')

		try {
			const result = await simulateSubmit()
			setSubmitResult('success')
			setSubmitMessage(result.message)
		} catch (error) {
			setSubmitResult('error')
			setSubmitMessage(error instanceof Error ? error.message : '提交失败，请重试')
		} finally {
			setIsSubmitting(false)
		}
	}

	const resetForm = () => {
		setFormData({
			username: '',
			email: '',
			password: '',
			confirmPassword: '',
			age: '',
			birthDate: '',
			phone: '',
			website: '',
			bio: '',
			country: '',
			newsletter: false,
			terms: false,
		})
		setErrors({})
		setSubmitResult(null)
		setSubmitMessage('')
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
			<div className="max-w-2xl mx-auto px-4">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">用户注册表单</h1>
						<p className="text-gray-600 dark:text-gray-300">测试各种表单输入、验证和提交功能</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-6">
						{/* 用户名 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								用户名 *
							</label>
							<input
								type="text"
								value={formData.username}
								onChange={(e) => handleInputChange('username', e.target.value)}
								className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
									errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
								}`}
								placeholder="请输入用户名"
							/>
							{errors.username && (
								<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
							)}
						</div>

						{/* 邮箱 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								邮箱地址 *
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) => handleInputChange('email', e.target.value)}
								className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
									errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
								}`}
								placeholder="请输入邮箱地址"
							/>
							{errors.email && (
								<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
							)}
						</div>

						{/* 密码 */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									密码 *
								</label>
								<input
									type="password"
									value={formData.password}
									onChange={(e) => handleInputChange('password', e.target.value)}
									className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
										errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
									}`}
									placeholder="请输入密码"
								/>
								{errors.password && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									确认密码 *
								</label>
								<input
									type="password"
									value={formData.confirmPassword}
									onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
									className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
										errors.confirmPassword
											? 'border-red-500'
											: 'border-gray-300 dark:border-gray-600'
									}`}
									placeholder="请再次输入密码"
								/>
								{errors.confirmPassword && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">
										{errors.confirmPassword}
									</p>
								)}
							</div>
						</div>

						{/* 年龄和生日 */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									年龄 *
								</label>
								<input
									type="number"
									value={formData.age}
									onChange={(e) => handleInputChange('age', e.target.value)}
									className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
										errors.age ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
									}`}
									placeholder="请输入年龄"
									min="18"
									max="120"
								/>
								{errors.age && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.age}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									出生日期
								</label>
								<input
									type="date"
									value={formData.birthDate}
									onChange={(e) => handleInputChange('birthDate', e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								/>
							</div>
						</div>

						{/* 手机和网站 */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									手机号 *
								</label>
								<input
									type="tel"
									value={formData.phone}
									onChange={(e) => handleInputChange('phone', e.target.value)}
									className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
										errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
									}`}
									placeholder="请输入手机号"
								/>
								{errors.phone && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									个人网站
								</label>
								<input
									type="url"
									value={formData.website}
									onChange={(e) => handleInputChange('website', e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
									placeholder="https://example.com"
								/>
							</div>
						</div>

						{/* 国家选择 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								国家/地区
							</label>
							<select
								value={formData.country}
								onChange={(e) => handleInputChange('country', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="">请选择国家/地区</option>
								<option value="CN">中国</option>
								<option value="US">美国</option>
								<option value="JP">日本</option>
								<option value="KR">韩国</option>
								<option value="GB">英国</option>
								<option value="DE">德国</option>
								<option value="FR">法国</option>
								<option value="CA">加拿大</option>
								<option value="AU">澳大利亚</option>
							</select>
						</div>

						{/* 个人简介 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								个人简介
							</label>
							<textarea
								value={formData.bio}
								onChange={(e) => handleInputChange('bio', e.target.value)}
								rows={4}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								placeholder="请简单介绍一下自己..."
							/>
						</div>

						{/* 复选框 */}
						<div className="space-y-3">
							<div className="flex items-center">
								<input
									type="checkbox"
									id="newsletter"
									checked={formData.newsletter}
									onChange={(e) => handleInputChange('newsletter', e.target.checked)}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="newsletter"
									className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
								>
									订阅我们的新闻通讯
								</label>
							</div>
							<div className="flex items-center">
								<input
									type="checkbox"
									id="terms"
									checked={formData.terms}
									onChange={(e) => handleInputChange('terms', e.target.checked)}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="terms"
									className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
								>
									我同意{' '}
									<a href="#" className="text-blue-600 hover:text-blue-500">
										服务条款
									</a>{' '}
									和{' '}
									<a href="#" className="text-blue-600 hover:text-blue-500">
										隐私政策
									</a>{' '}
									*
								</label>
							</div>
							{errors.terms && (
								<p className="text-sm text-red-600 dark:text-red-400">{errors.terms}</p>
							)}
						</div>

						{/* 提交结果 */}
						{submitResult && (
							<div
								className={`p-4 rounded-md ${
									submitResult === 'success'
										? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700'
										: 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700'
								}`}
							>
								<p
									className={`text-sm ${
										submitResult === 'success'
											? 'text-green-800 dark:text-green-200'
											: 'text-red-800 dark:text-red-200'
									}`}
								>
									{submitMessage}
								</p>
							</div>
						)}

						{/* 按钮组 */}
						<div className="flex flex-col sm:flex-row gap-4">
							<button
								type="submit"
								disabled={isSubmitting}
								className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								{isSubmitting ? (
									<span className="flex items-center justify-center">
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
										提交中...
									</span>
								) : (
									'注册账户'
								)}
							</button>
							<button
								type="button"
								onClick={resetForm}
								className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
							>
								重置表单
							</button>
						</div>
					</form>

					<div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
						<Link href="/" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
							← 返回测试页面列表
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}
