import { useState } from 'react'
import { Link } from 'wouter'

export default function NavigationTestPage() {
	const [activeTab, setActiveTab] = useState('home')
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDropdownOpen, setIsDropdownOpen] = useState(false)
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
	const [breadcrumbs, setBreadcrumbs] = useState(['首页', '产品', '手机'])
	const [notifications, setNotifications] = useState([
		{ id: 1, title: '新消息', content: '您有一条新的私信', time: '2分钟前', unread: true },
		{ id: 2, title: '系统通知', content: '系统将于今晚维护', time: '1小时前', unread: true },
		{ id: 3, title: '订单更新', content: '您的订单已发货', time: '3小时前', unread: false },
	])

	const handleBreadcrumbClick = (index: number) => {
		const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
		setBreadcrumbs(newBreadcrumbs)
	}

	const markNotificationAsRead = (id: number) => {
		setNotifications((prev) =>
			prev.map((notif) => (notif.id === id ? { ...notif, unread: false } : notif))
		)
	}

	const unreadCount = notifications.filter((n) => n.unread).length

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* 顶部导航栏 */}
			<nav className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
				<div className="max-w-7xl mx-auto px-4">
					<div className="flex justify-between items-center h-16">
						{/* Logo */}
						<div className="flex items-center">
							<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">TestNav</div>
						</div>

						{/* 主导航菜单 */}
						<div className="hidden md:flex space-x-8">
							<a
								href="#"
								className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
							>
								首页
							</a>

							{/* 产品下拉菜单 */}
							<div className="relative">
								<button
									onClick={() => setIsDropdownOpen(!isDropdownOpen)}
									className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
								>
									产品
									<svg
										className="ml-1 h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</button>

								{isDropdownOpen && (
									<div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
										<div className="py-1">
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												手机
											</a>
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												电脑
											</a>
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												平板
											</a>
											<div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												配件
											</a>
										</div>
									</div>
								)}
							</div>

							<a
								href="#"
								className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
							>
								服务
							</a>
							<a
								href="#"
								className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
							>
								支持
							</a>
						</div>

						{/* 右侧菜单 */}
						<div className="flex items-center space-x-4">
							{/* 通知铃铛 */}
							<div className="relative">
								<button className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-full transition-colors">
									<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 0 1 6 6v2.25l2.25 2.25v2.25H2.25V14.25L4.5 12V9.75a6 6 0 0 1 6-6z"
										/>
									</svg>
									{unreadCount > 0 && (
										<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
											{unreadCount}
										</span>
									)}
								</button>
							</div>

							{/* 用户菜单 */}
							<div className="relative">
								<button
									onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
									className="flex items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-full transition-colors"
								>
									<div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
										U
									</div>
								</button>

								{isUserMenuOpen && (
									<div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
										<div className="py-1">
											<div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
												user@example.com
											</div>
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												个人资料
											</a>
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												设置
											</a>
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												帮助
											</a>
											<div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
											<a
												href="#"
												className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												退出登录
											</a>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</nav>

			{/* 面包屑导航 */}
			<div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
				<div className="max-w-7xl mx-auto px-4 py-3">
					<nav className="flex" aria-label="Breadcrumb">
						<ol className="flex items-center space-x-2">
							{breadcrumbs.map((crumb, crumbIdx) => {
								const isLast = crumbIdx === breadcrumbs.length - 1
								const showSeparator = crumbIdx > 0
								return (
									<li key={`${crumb}-${crumbIdx + 1}`} className="flex items-center">
										{showSeparator && (
											<svg
												className="h-4 w-4 text-gray-400 mx-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 5l7 7-7 7"
												/>
											</svg>
										)}
										<button
											onClick={() => handleBreadcrumbClick(crumbIdx)}
											className={`text-sm font-medium transition-colors ${
												isLast
													? 'text-gray-500 dark:text-gray-400 cursor-default'
													: 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
											}`}
										>
											{crumb}
										</button>
									</li>
								)
							})}
						</ol>
					</nav>
				</div>
			</div>

			{/* 主要内容区域 */}
			<div className="max-w-7xl mx-auto px-4 py-8">
				{/* 标签页导航 */}
				<div className="mb-8">
					<div className="border-b border-gray-200 dark:border-gray-700">
						<nav className="-mb-px flex space-x-8">
							{[
								{ id: 'home', label: '概览', icon: '🏠' },
								{ id: 'products', label: '产品列表', icon: '📱' },
								{ id: 'orders', label: '订单管理', icon: '📦' },
								{ id: 'analytics', label: '数据分析', icon: '📊' },
								{ id: 'settings', label: '设置', icon: '⚙️' },
							].map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
										activeTab === tab.id
											? 'border-blue-500 text-blue-600 dark:text-blue-400'
											: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
									}`}
								>
									<span className="mr-2">{tab.icon}</span>
									{tab.label}
								</button>
							))}
						</nav>
					</div>
				</div>

				{/* 标签页内容 */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
					{activeTab === 'home' && (
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">概览</h2>
							<p className="text-gray-600 dark:text-gray-300 mb-6">
								欢迎来到导航测试页面！这里展示了各种常见的导航模式。
							</p>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
									<h3 className="font-semibold text-blue-900 dark:text-blue-100">总销售额</h3>
									<p className="text-2xl font-bold text-blue-600 dark:text-blue-400">¥123,456</p>
								</div>
								<div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
									<h3 className="font-semibold text-green-900 dark:text-green-100">订单数量</h3>
									<p className="text-2xl font-bold text-green-600 dark:text-green-400">1,234</p>
								</div>
								<div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
									<h3 className="font-semibold text-purple-900 dark:text-purple-100">用户数量</h3>
									<p className="text-2xl font-bold text-purple-600 dark:text-purple-400">5,678</p>
								</div>
							</div>
						</div>
					)}

					{activeTab === 'products' && (
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">产品列表</h2>
							<div className="space-y-4">
								{['iPhone 15 Pro', 'MacBook Air', 'iPad Pro', 'Apple Watch'].map((product) => (
									<div
										key={product}
										className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
									>
										<div>
											<h3 className="font-medium text-gray-900 dark:text-white">{product}</h3>
											<p className="text-gray-500 dark:text-gray-400">产品描述...</p>
										</div>
										<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
											查看详情
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === 'orders' && (
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">订单管理</h2>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
									<thead className="bg-gray-50 dark:bg-gray-700">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												订单号
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												客户
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												状态
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												金额
											</th>
										</tr>
									</thead>
									<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
										{[
											{ id: '#001', customer: '张三', status: '已发货', amount: '¥1,299' },
											{ id: '#002', customer: '李四', status: '处理中', amount: '¥2,599' },
											{ id: '#003', customer: '王五', status: '已完成', amount: '¥899' },
										].map((order) => (
											<tr key={order.id}>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
													{order.id}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
													{order.customer}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span
														className={`px-2 py-1 text-xs font-medium rounded-full ${
															order.status === '已完成'
																? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
																: order.status === '已发货'
																	? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
																	: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
														}`}
													>
														{order.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
													{order.amount}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{activeTab === 'analytics' && (
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">数据分析</h2>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
									<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
										销售趋势
									</h3>
									<div className="h-32 bg-linear-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white">
										📈 图表占位符
									</div>
								</div>
								<div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
									<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
										用户分布
									</h3>
									<div className="h-32 bg-linear-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center text-white">
										🗺️ 地图占位符
									</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === 'settings' && (
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">设置</h2>
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
										通知设置
									</h3>
									<div className="space-y-2">
										<label className="flex items-center">
											<input
												type="checkbox"
												className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												defaultChecked
											/>
											<span className="ml-2 text-gray-700 dark:text-gray-300">邮件通知</span>
										</label>
										<label className="flex items-center">
											<input
												type="checkbox"
												className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span className="ml-2 text-gray-700 dark:text-gray-300">短信通知</span>
										</label>
									</div>
								</div>
								<div>
									<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
										隐私设置
									</h3>
									<div className="space-y-2">
										<label className="flex items-center">
											<input
												type="checkbox"
												className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												defaultChecked
											/>
											<span className="ml-2 text-gray-700 dark:text-gray-300">公开个人资料</span>
										</label>
										<label className="flex items-center">
											<input
												type="checkbox"
												className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												defaultChecked
											/>
											<span className="ml-2 text-gray-700 dark:text-gray-300">允许搜索</span>
										</label>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* 操作按钮 */}
				<div className="mt-8 flex flex-wrap gap-4">
					<button
						onClick={() => setIsModalOpen(true)}
						className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
					>
						打开模态框
					</button>
					<button
						onClick={() => setBreadcrumbs([...breadcrumbs, `新页面${breadcrumbs.length}`])}
						className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
					>
						添加面包屑
					</button>
					<button
						onClick={() => {
							const newNotif = {
								id: Date.now(),
								title: '新通知',
								content: `这是第 ${notifications.length + 1} 条通知`,
								time: '刚刚',
								unread: true,
							}
							setNotifications((prev) => [newNotif, ...prev])
						}}
						className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors"
					>
						添加通知
					</button>
				</div>

				{/* 通知列表 */}
				{notifications.length > 0 && (
					<div className="mt-8">
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">通知中心</h3>
						<div className="space-y-2">
							{notifications.map((notification) => (
								<div
									key={notification.id}
									className={`p-4 rounded-lg border cursor-pointer transition-colors ${
										notification.unread
											? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
											: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
									}`}
									onClick={() => markNotificationAsRead(notification.id)}
								>
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<h4 className="font-medium text-gray-900 dark:text-white">
												{notification.title}
											</h4>
											<p className="text-gray-600 dark:text-gray-300 text-sm">
												{notification.content}
											</p>
										</div>
										<div className="flex items-center space-x-2">
											<span className="text-xs text-gray-500 dark:text-gray-400">
												{notification.time}
											</span>
											{notification.unread && (
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* 模态框 */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white">模态框标题</h3>
							<button
								onClick={() => setIsModalOpen(false)}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
						<p className="text-gray-600 dark:text-gray-300 mb-6">
							这是一个模态框示例，用于测试弹窗交互。Agent 需要能够识别并操作这类覆盖层元素。
						</p>
						<div className="flex justify-end space-x-3">
							<button
								onClick={() => setIsModalOpen(false)}
								className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
							>
								取消
							</button>
							<button
								onClick={() => setIsModalOpen(false)}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
							>
								确认
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 返回链接 */}
			<div className="max-w-7xl mx-auto px-4 py-8">
				<Link href="/" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
					← 返回测试页面列表
				</Link>
			</div>
		</div>
	)
}
