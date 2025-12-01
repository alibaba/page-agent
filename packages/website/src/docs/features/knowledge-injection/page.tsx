import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function KnowledgeInjection() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">知识库注入</h1>

			<BetaNotice />

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				通过多层次的知识注入，让 AI 深度理解你的业务场景和应用逻辑，实现更精准的自动化操作。
			</p>

			{/* Custom Instruction */}
			<section className="mb-12">
				<h2 className="text-3xl font-bold mb-6">Instruction - 系统指令</h2>

				<div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-6">
					<h3 className="text-xl font-semibold mb-3 text-purple-900 dark:text-purple-300">
						🎯 系统级指令
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						为 AI 设定全局行为准则和工作风格。
					</p>
					<ul className="list-disc list-inside space-y-2 text-gray-500 dark:text-gray-400">
						<li>定义 AI 的工作风格和交互方式</li>
						<li>设置安全边界和操作限制</li>
						<li>指定错误处理和异常情况的应对策略</li>
						<li>配置输出格式和反馈机制</li>
					</ul>
				</div>

				<CodeEditor
					className="mb-6"
					code={`// 构造函数中设置系统指令
const pageAgent = new PageAgent({
  instruction: \`
# 角色定义
你是专业的电商运营助手。

# 工作风格
- 谨慎：操作前确认
- 准确：确保正确性
- 高效：优化流程

# 错误处理
遇到错误时暂停并报告。
\`
});`}
				/>
			</section>

			{/* App Knowledge */}
			<section className="mb-12">
				<h2 className="text-3xl font-bold mb-6">App Knowledge - 应用知识</h2>

				<div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
					<h3 className="text-xl font-semibold mb-3 text-blue-900 dark:text-blue-300">
						� 业务领域知识
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						注入应用的核心业务知识，包括产品介绍、操作流程、术语定义等，让 AI 理解业务上下文。
					</p>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<h4 className="font-semibold text-blue-800 dark:text-blue-200">产品知识</h4>
							<ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
								<li>产品功能和特性介绍</li>
								<li>用户角色和权限体系</li>
								<li>业务规则和约束条件</li>
							</ul>
						</div>
						<div className="space-y-2">
							<h4 className="font-semibold text-blue-800 dark:text-blue-200">操作指南</h4>
							<ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
								<li>标准操作流程定义</li>
								<li>异常情况处理方案</li>
								<li>术语和概念解释</li>
							</ul>
						</div>
					</div>
				</div>

				<CodeEditor
					className="mb-6"
					code={`// 应用知识
pageAgent.knowledge.setAppKnowledge(\`
# 产品介绍
电商管理系统：面向中小企业的一站式解决方案。

# 操作流程
## 商品上架
1. 进入商品管理页面 2. 点击新增商品 3. 填写基本信息 4. 设置库存 5. 提交审核

# 术语解释
- SKU：库存量单位
- SPU：标准产品单位
- 运费模板：物流费用计算规则

# 业务规则
- 库存为0时自动下架
- VIP会员享9.5折
\`);`}
				/>
			</section>

			{/* Page Knowledge */}
			<section className="mb-12">
				<h2 className="text-3xl font-bold mb-6">Page Knowledge - 页面知识</h2>

				<div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg mb-6">
					<h3 className="text-xl font-semibold mb-3 text-green-900 dark:text-green-300">
						📄 页面级精准指导
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						为特定页面提供精确的操作指导和元素说明，让 AI 准确理解页面结构和交互逻辑。
					</p>
					<div className="grid md:grid-cols-3 gap-4">
						<div className="space-y-2">
							<h4 className="font-semibold text-green-800 dark:text-green-200">元素标注</h4>
							<p className="text-sm text-gray-500 dark:text-gray-400">为页面元素添加语义化描述</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-semibold text-green-800 dark:text-green-200">交互说明</h4>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								定义元素的交互行为和预期结果
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-semibold text-green-800 dark:text-green-200">页面逻辑</h4>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								说明页面的业务逻辑和状态变化
							</p>
						</div>
					</div>
				</div>

				<CodeEditor
					className="mb-6"
					code={`// 页面知识库
// 添加页面知识
pageAgent.knowledge.addPageKnowledge("/products", \`
商品列表页面，包含搜索、筛选、批量操作功能。
#add-product-btn：新增商品按钮
.product-item：商品列表项
#search-input：搜索框，最少2个字符
\`);

pageAgent.knowledge.addPageKnowledge("/orders/*", \`
订单详情页面。
.order-status：订单状态标签
#update-status-btn：状态更新按钮
\`);

// 移除页面知识
pageAgent.knowledge.removePageKnowledge("/products");`}
				/>
			</section>
		</div>
	)
}
