import { useState } from 'react'
import { Link } from 'wouter'

interface CartItem {
	id: number
	name: string
	price: number
	quantity: number
	image: string
}

interface WizardStep {
	id: number
	title: string
	description: string
	completed: boolean
}

export default function ComplexTestPage() {
	const [currentStep, setCurrentStep] = useState(1)
	const [cartItems, setCartItems] = useState<CartItem[]>([
		{
			id: 1,
			name: 'iPhone 15 Pro',
			price: 7999,
			quantity: 1,
			image: 'https://picsum.photos/100/100?random=1',
		},
		{
			id: 2,
			name: 'MacBook Air',
			price: 8999,
			quantity: 1,
			image: 'https://picsum.photos/100/100?random=2',
		},
	])
	const [wizardData, setWizardData] = useState({
		personalInfo: { name: '', email: '', phone: '' },
		address: { street: '', city: '', zipCode: '' },
		payment: { cardNumber: '', expiryDate: '', cvv: '' },
	})
	const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([
		{ id: 1, title: '个人信息', description: '填写基本信息', completed: false },
		{ id: 2, title: '收货地址', description: '填写收货地址', completed: false },
		{ id: 3, title: '支付方式', description: '选择支付方式', completed: false },
		{ id: 4, title: '确认订单', description: '确认订单信息', completed: false },
	])
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [orderComplete, setOrderComplete] = useState(false)

	// 购物车操作
	const updateQuantity = (id: number, newQuantity: number) => {
		if (newQuantity <= 0) {
			removeItem(id)
			return
		}
		setCartItems((prev) =>
			prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
		)
	}

	const removeItem = (id: number) => {
		setCartItems((prev) => prev.filter((item) => item.id !== id))
	}

	const addItem = () => {
		const newItem: CartItem = {
			id: Date.now(),
			name: `新产品 ${cartItems.length + 1}`,
			price: Math.floor(Math.random() * 5000) + 1000,
			quantity: 1,
			image: `https://picsum.photos/100/100?random=${Date.now()}`,
		}
		setCartItems((prev) => [...prev, newItem])
	}

	const getTotalPrice = () => {
		return cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
	}

	// 向导步骤验证
	const validateStep = (step: number): boolean => {
		switch (step) {
			case 1:
				return !!(
					wizardData.personalInfo.name &&
					wizardData.personalInfo.email &&
					wizardData.personalInfo.phone
				)
			case 2:
				return !!(
					wizardData.address.street &&
					wizardData.address.city &&
					wizardData.address.zipCode
				)
			case 3:
				return !!(
					wizardData.payment.cardNumber &&
					wizardData.payment.expiryDate &&
					wizardData.payment.cvv
				)
			default:
				return true
		}
	}

	const goToStep = (step: number) => {
		// 验证当前步骤
		if (step > currentStep && !validateStep(currentStep)) {
			alert('请完成当前步骤的必填信息')
			return
		}

		// 更新步骤完成状态
		if (step > currentStep) {
			setWizardSteps((prev) =>
				prev.map((s) => (s.id === currentStep ? { ...s, completed: true } : s))
			)
		}

		setCurrentStep(step)
	}

	const handleInputChange = (section: string, field: string, value: string) => {
		setWizardData((prev) => ({
			...prev,
			[section]: {
				...prev[section as keyof typeof prev],
				[field]: value,
			},
		}))
	}

	const handleSubmitOrder = async () => {
		setIsProcessing(true)

		// 模拟处理时间
		await new Promise((resolve) => setTimeout(resolve, 3000))

		// 模拟随机失败
		if (Math.random() < 0.2) {
			setIsProcessing(false)
			alert('订单提交失败，请重试')
			return
		}

		setIsProcessing(false)
		setOrderComplete(true)
		setShowConfirmDialog(false)
	}

	const resetWizard = () => {
		setCurrentStep(1)
		setWizardData({
			personalInfo: { name: '', email: '', phone: '' },
			address: { street: '', city: '', zipCode: '' },
			payment: { cardNumber: '', expiryDate: '', cvv: '' },
		})
		setWizardSteps((prev) => prev.map((s) => ({ ...s, completed: false })))
		setOrderComplete(false)
		setShowConfirmDialog(false)
	}

	if (orderComplete) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="max-w-md mx-auto text-center">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
						<div className="text-6xl mb-4">🎉</div>
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
							订单提交成功！
						</h2>
						<p className="text-gray-600 dark:text-gray-300 mb-6">
							您的订单已成功提交，我们将尽快为您处理。
						</p>
						<div className="space-y-3">
							<button
								type="button"
								onClick={resetWizard}
								className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
							>
								重新开始
							</button>
							<Link
								href="/test-pages"
								className="block w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors text-center"
							>
								返回测试页面
							</Link>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
			<div className="max-w-6xl mx-auto px-4">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">复杂交互测试</h1>
					<p className="text-gray-600 dark:text-gray-300">测试多步骤操作、状态管理和复杂用户交互</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* 购物车区域 */}
					<div className="lg:col-span-1">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-8">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
								购物车 ({cartItems.length})
							</h3>

							<div className="space-y-4 mb-6">
								{cartItems.map((item) => (
									<div
										key={item.id}
										className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
									>
										<img
											src={item.image}
											alt={item.name}
											className="w-12 h-12 object-cover rounded"
										/>
										<div className="flex-1 min-w-0">
											<h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
												{item.name}
											</h4>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												¥{item.price.toLocaleString()}
											</p>
										</div>
										<div className="flex items-center space-x-2">
											<button
												onClick={() => updateQuantity(item.id, item.quantity - 1)}
												className="w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
											>
												-
											</button>
											<span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
											<button
												onClick={() => updateQuantity(item.id, item.quantity + 1)}
												className="w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
											>
												+
											</button>
											<button
												onClick={() => removeItem(item.id)}
												className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded text-sm hover:bg-red-600"
											>
												×
											</button>
										</div>
									</div>
								))}
							</div>

							<button
								onClick={addItem}
								className="w-full mb-4 py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
							>
								+ 添加商品
							</button>

							<div className="border-t border-gray-200 dark:border-gray-600 pt-4">
								<div className="flex justify-between items-center text-lg font-semibold text-gray-900 dark:text-white">
									<span>总计:</span>
									<span>¥{getTotalPrice().toLocaleString()}</span>
								</div>
							</div>
						</div>
					</div>

					{/* 向导区域 */}
					<div className="lg:col-span-2">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
							{/* 步骤指示器 */}
							<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
								<div className="flex items-center justify-between">
									{wizardSteps.map((step, index) => (
										<div key={step.id} className="flex items-center">
											<button
												onClick={() => goToStep(step.id)}
												className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
													step.completed
														? 'bg-green-500 text-white'
														: step.id === currentStep
															? 'bg-blue-500 text-white'
															: 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
												}`}
											>
												{step.completed ? '✓' : step.id}
											</button>
											{index < wizardSteps.length - 1 && (
												<div
													className={`w-16 h-1 mx-2 ${
														step.completed ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
													}`}
												/>
											)}
										</div>
									))}
								</div>
								<div className="mt-4">
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
										{wizardSteps[currentStep - 1].title}
									</h3>
									<p className="text-gray-600 dark:text-gray-300">
										{wizardSteps[currentStep - 1].description}
									</p>
								</div>
							</div>

							{/* 步骤内容 */}
							<div className="p-6">
								{currentStep === 1 && (
									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												姓名 *
											</label>
											<input
												type="text"
												value={wizardData.personalInfo.name}
												onChange={(e) => handleInputChange('personalInfo', 'name', e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
												placeholder="请输入您的姓名"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												邮箱 *
											</label>
											<input
												type="email"
												value={wizardData.personalInfo.email}
												onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
												placeholder="请输入您的邮箱"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												手机号 *
											</label>
											<input
												type="tel"
												value={wizardData.personalInfo.phone}
												onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
												placeholder="请输入您的手机号"
											/>
										</div>
									</div>
								)}

								{currentStep === 2 && (
									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												详细地址 *
											</label>
											<input
												type="text"
												value={wizardData.address.street}
												onChange={(e) => handleInputChange('address', 'street', e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
												placeholder="请输入详细地址"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												城市 *
											</label>
											<input
												type="text"
												value={wizardData.address.city}
												onChange={(e) => handleInputChange('address', 'city', e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
												placeholder="请输入城市"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												邮政编码 *
											</label>
											<input
												type="text"
												value={wizardData.address.zipCode}
												onChange={(e) => handleInputChange('address', 'zipCode', e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
												placeholder="请输入邮政编码"
											/>
										</div>
									</div>
								)}

								{currentStep === 3 && (
									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
												银行卡号 *
											</label>
											<input
												type="text"
												value={wizardData.payment.cardNumber}
												onChange={(e) => handleInputChange('payment', 'cardNumber', e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
												placeholder="请输入银行卡号"
											/>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
													有效期 *
												</label>
												<input
													type="text"
													value={wizardData.payment.expiryDate}
													onChange={(e) =>
														handleInputChange('payment', 'expiryDate', e.target.value)
													}
													className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
													placeholder="MM/YY"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
													CVV *
												</label>
												<input
													type="text"
													value={wizardData.payment.cvv}
													onChange={(e) => handleInputChange('payment', 'cvv', e.target.value)}
													className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
													placeholder="CVV"
												/>
											</div>
										</div>
									</div>
								)}

								{currentStep === 4 && (
									<div className="space-y-6">
										<div>
											<h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
												订单确认
											</h4>

											<div className="space-y-4">
												<div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
													<h5 className="font-medium text-gray-900 dark:text-white mb-2">
														个人信息
													</h5>
													<p className="text-sm text-gray-600 dark:text-gray-300">
														{wizardData.personalInfo.name} | {wizardData.personalInfo.email} |{' '}
														{wizardData.personalInfo.phone}
													</p>
												</div>

												<div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
													<h5 className="font-medium text-gray-900 dark:text-white mb-2">
														收货地址
													</h5>
													<p className="text-sm text-gray-600 dark:text-gray-300">
														{wizardData.address.street}, {wizardData.address.city}{' '}
														{wizardData.address.zipCode}
													</p>
												</div>

												<div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
													<h5 className="font-medium text-gray-900 dark:text-white mb-2">
														支付方式
													</h5>
													<p className="text-sm text-gray-600 dark:text-gray-300">
														**** **** **** {wizardData.payment.cardNumber.slice(-4)}
													</p>
												</div>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* 导航按钮 */}
							<div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex justify-between">
								<button
									onClick={() => goToStep(currentStep - 1)}
									disabled={currentStep === 1}
									className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									上一步
								</button>

								{currentStep < 4 ? (
									<button
										onClick={() => goToStep(currentStep + 1)}
										disabled={!validateStep(currentStep)}
										className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors"
									>
										下一步
									</button>
								) : (
									<button
										onClick={() => setShowConfirmDialog(true)}
										disabled={cartItems.length === 0}
										className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors"
									>
										提交订单
									</button>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* 确认对话框 */}
				{showConfirmDialog && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
								确认提交订单
							</h3>
							<p className="text-gray-600 dark:text-gray-300 mb-6">
								您确定要提交这个订单吗？订单总金额为 ¥{getTotalPrice().toLocaleString()}
							</p>
							<div className="flex justify-end space-x-3">
								<button
									onClick={() => setShowConfirmDialog(false)}
									disabled={isProcessing}
									className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
								>
									取消
								</button>
								<button
									onClick={handleSubmitOrder}
									disabled={isProcessing}
									className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center"
								>
									{isProcessing ? (
										<>
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
											处理中...
										</>
									) : (
										'确认提交'
									)}
								</button>
							</div>
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
