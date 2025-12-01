import { Link } from 'wouter'

export default function IndexPage() {
	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-8">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
						Page Use Agent 测试页面
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-300">
						用于测试 AI Agent 网页操作能力的综合测试套件
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					<TestPageCard
						title="表单测试"
						description="测试输入、验证、提交等表单操作"
						path="/form"
						icon="📝"
						difficulty="简单"
					/>
					<TestPageCard
						title="导航测试"
						description="测试菜单、下拉框、弹窗等交互"
						path="/navigation"
						icon="🧭"
						difficulty="中等"
					/>
					<TestPageCard
						title="列表测试"
						description="测试滚动、分页、搜索、排序"
						path="/list"
						icon="📋"
						difficulty="中等"
					/>
					<TestPageCard
						title="复杂交互"
						description="测试多步骤操作和状态管理"
						path="/complex"
						icon="⚙️"
						difficulty="困难"
					/>
					<TestPageCard
						title="错误处理"
						description="测试错误识别和重试机制"
						path="/errors"
						icon="⚠️"
						difficulty="困难"
					/>
					<TestPageCard
						title="异步操作"
						description="测试等待、加载状态识别"
						path="/async"
						icon="⏳"
						difficulty="中等"
					/>
				</div>

				<div className="text-center">
					<Link
						href="/"
						className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
					>
						← 回到 Page Use 首页
					</Link>
				</div>
			</div>
		</div>
	)
}

interface TestPageCardProps {
	title: string
	description: string
	path: string
	icon: string
	difficulty: string
}

function TestPageCard({ title, description, path, icon, difficulty }: TestPageCardProps) {
	const difficultyColors = {
		简单: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		中等: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
		困难: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
	}

	return (
		<Link href={path}>
			<div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-200 dark:border-gray-700">
				<div className="text-4xl mb-4">{icon}</div>
				<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
				<p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">{description}</p>
				<div className="flex justify-between items-center">
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[difficulty as keyof typeof difficultyColors]}`}
					>
						{difficulty}
					</span>
					<span className="text-blue-600 dark:text-blue-400 text-sm font-medium">开始测试 →</span>
				</div>
			</div>
		</Link>
	)
}
