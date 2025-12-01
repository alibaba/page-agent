import { useEffect, useMemo, useState } from 'react'
import { Link } from 'wouter'

interface Product {
	id: number
	name: string
	category: string
	price: number
	stock: number
	rating: number
	image: string
	description: string
	tags: string[]
}

const generateProducts = (count: number): Product[] => {
	const categories = ['手机', '电脑', '平板', '耳机', '手表', '相机']
	const brands = ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Sony', 'Dell']
	const adjectives = ['Pro', 'Max', 'Ultra', 'Plus', 'Air', 'Mini']

	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		name: `${brands[i % brands.length]} ${categories[i % categories.length]} ${adjectives[i % adjectives.length]}`,
		category: categories[i % categories.length],
		price: Math.floor(Math.random() * 10000) + 500,
		stock: Math.floor(Math.random() * 100),
		rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
		image: `https://picsum.photos/200/200?random=${i}`,
		description: `这是一款优秀的${categories[i % categories.length]}产品，具有出色的性能和设计。`,
		tags: ['热销', '新品', '推荐'].slice(0, Math.floor(Math.random() * 3) + 1),
	}))
}

// Loading skeleton component
const LoadingSkeleton = () => (
	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
		{Array.from({ length: 12 }, (_, i) => `skeleton-item-${i}`).map((id) => (
			<div key={id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
				<div className="bg-gray-300 dark:bg-gray-600 h-48 rounded-lg mb-4"></div>
				<div className="space-y-2">
					<div className="bg-gray-300 dark:bg-gray-600 h-4 rounded w-3/4"></div>
					<div className="bg-gray-300 dark:bg-gray-600 h-4 rounded w-1/2"></div>
					<div className="bg-gray-300 dark:bg-gray-600 h-4 rounded w-1/4"></div>
				</div>
			</div>
		))}
	</div>
)

// Product card component
const ProductCard = ({ product }: { product: Product }) => (
	<div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-4">
		<div className="relative mb-4">
			<img
				src={product.image}
				alt={product.name}
				className="w-full h-48 object-cover rounded-lg"
				loading="lazy"
			/>
			<div className="absolute top-2 right-2 flex flex-wrap gap-1">
				{product.tags.map((tag) => (
					<span key={tag} className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
						{tag}
					</span>
				))}
			</div>
		</div>
		<h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
			{product.name}
		</h3>
		<p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
			{product.description}
		</p>
		<div className="flex items-center justify-between mb-3">
			<span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
				¥{product.price.toLocaleString()}
			</span>
			<div className="flex items-center">
				<span className="text-yellow-400">★</span>
				<span className="text-sm text-gray-600 dark:text-gray-300 ml-1">{product.rating}</span>
			</div>
		</div>
		<div className="flex items-center justify-between mb-4">
			<span className="text-sm text-gray-500 dark:text-gray-400">库存: {product.stock}</span>
			<span className="text-sm text-gray-500 dark:text-gray-400">{product.category}</span>
		</div>
		<button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
			加入购物车
		</button>
	</div>
)

// Product list item component
const ProductListItem = ({ product }: { product: Product }) => (
	<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center space-x-4">
		<img
			src={product.image}
			alt={product.name}
			className="w-20 h-20 object-cover rounded-lg shrink-0"
			loading="lazy"
		/>
		<div className="flex-1 min-w-0">
			<h3 className="font-semibold text-gray-900 dark:text-white mb-1">{product.name}</h3>
			<p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-1">
				{product.description}
			</p>
			<div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
				<span>{product.category}</span>
				<span>库存: {product.stock}</span>
				<div className="flex items-center">
					<span className="text-yellow-400">★</span>
					<span className="ml-1">{product.rating}</span>
				</div>
			</div>
		</div>
		<div className="flex items-center space-x-4">
			<span className="text-xl font-bold text-blue-600 dark:text-blue-400">
				¥{product.price.toLocaleString()}
			</span>
			<button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
				加入购物车
			</button>
		</div>
	</div>
)

// Pagination component
interface PaginationProps {
	currentPage: number
	totalPages: number
	startIndex: number
	endIndex: number
	totalItems: number
	onPageChange: (page: number) => void
}

const Pagination = ({
	currentPage,
	totalPages,
	startIndex,
	endIndex,
	totalItems,
	onPageChange,
}: PaginationProps) => {
	const getPageNumbers = () => {
		const pages = []
		const maxVisible = 5
		let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
		const end = Math.min(totalPages, start + maxVisible - 1)

		if (end - start + 1 < maxVisible) {
			start = Math.max(1, end - maxVisible + 1)
		}

		for (let i = start; i <= end; i++) {
			pages.push(i)
		}
		return pages
	}

	return (
		<div className="flex items-center justify-between mt-8">
			<div className="text-sm text-gray-700 dark:text-gray-300">
				显示 {startIndex + 1}-{Math.min(endIndex, totalItems)} 条， 共 {totalItems} 条结果
			</div>
			<div className="flex items-center space-x-2">
				<button
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					上一页
				</button>
				{getPageNumbers().map((page) => (
					<button
						key={page}
						onClick={() => onPageChange(page)}
						className={`px-3 py-2 text-sm font-medium rounded-md ${
							page === currentPage
								? 'bg-blue-600 text-white'
								: 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
						}`}
					>
						{page}
					</button>
				))}
				<button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					下一页
				</button>
			</div>
		</div>
	)
}

export default function ListTestPage() {
	const [products, setProducts] = useState<Product[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedCategory, setSelectedCategory] = useState('全部')
	const [sortBy, setSortBy] = useState('name')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(12)
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

	const categories = ['全部', '手机', '电脑', '平板', '耳机', '手表', '相机']

	// Helper to set filters and reset page
	const handleSearchChange = (term: string) => {
		setSearchTerm(term)
		setCurrentPage(1)
	}

	const handleCategoryChange = (category: string) => {
		setSelectedCategory(category)
		setCurrentPage(1)
	}

	const handleSortChange = (sort: string) => {
		setSortBy(sort)
		setCurrentPage(1)
	}

	const handleSortOrderChange = (order: 'asc' | 'desc') => {
		setSortOrder(order)
		setCurrentPage(1)
	}

	// 模拟数据加载
	useEffect(() => {
		const loadData = async () => {
			setLoading(true)
			// 模拟网络延迟
			await new Promise((resolve) => setTimeout(resolve, 1500))
			const data = generateProducts(150)
			setProducts(data)
			setLoading(false)
		}
		loadData()
	}, [])

	// 搜索和过滤 - Use useMemo to compute filtered products
	const filteredProducts = useMemo(() => {
		let filtered = [...products]

		// 按类别过滤
		if (selectedCategory !== '全部') {
			filtered = filtered.filter((product) => product.category === selectedCategory)
		}

		// 按搜索词过滤
		if (searchTerm) {
			filtered = filtered.filter(
				(product) =>
					product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					product.description.toLowerCase().includes(searchTerm.toLowerCase())
			)
		}

		// 排序
		filtered.sort((a, b) => {
			let aValue: any = a[sortBy as keyof Product]
			let bValue: any = b[sortBy as keyof Product]

			if (typeof aValue === 'string') {
				aValue = aValue.toLowerCase()
				bValue = bValue.toLowerCase()
			}

			if (sortOrder === 'asc') {
				return aValue > bValue ? 1 : -1
			} else {
				return aValue < bValue ? 1 : -1
			}
		})

		return filtered
	}, [products, searchTerm, selectedCategory, sortBy, sortOrder])

	// 分页计算
	const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const currentProducts = filteredProducts.slice(startIndex, endIndex)

	const handlePageChange = (page: number) => {
		setCurrentPage(page)
		// 滚动到顶部
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
			<div className="max-w-7xl mx-auto px-4">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">产品列表测试</h1>
					<p className="text-gray-600 dark:text-gray-300">测试搜索、过滤、排序、分页和滚动功能</p>
				</div>

				{/* 搜索和过滤栏 */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
						{/* 搜索框 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								搜索产品
							</label>
							<input
								type="text"
								value={searchTerm}
								onChange={(e) => handleSearchChange(e.target.value)}
								placeholder="输入产品名称或描述..."
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							/>
						</div>

						{/* 类别过滤 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								产品类别
							</label>
							<select
								value={selectedCategory}
								onChange={(e) => handleCategoryChange(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							>
								{categories.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</div>

						{/* 排序方式 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								排序方式
							</label>
							<select
								value={sortBy}
								onChange={(e) => handleSortChange(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="name">名称</option>
								<option value="price">价格</option>
								<option value="rating">评分</option>
								<option value="stock">库存</option>
							</select>
						</div>

						{/* 排序顺序 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								排序顺序
							</label>
							<select
								value={sortOrder}
								onChange={(e) => handleSortOrderChange(e.target.value as 'asc' | 'desc')}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="asc">升序</option>
								<option value="desc">降序</option>
							</select>
						</div>
					</div>

					{/* 视图控制 */}
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
								每页显示:
							</span>
							<select
								value={itemsPerPage}
								onChange={(e) => setItemsPerPage(Number(e.target.value))}
								className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value={12}>12</option>
								<option value={24}>24</option>
								<option value={48}>48</option>
							</select>
						</div>

						<div className="flex items-center space-x-2">
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">视图:</span>
							<button
								onClick={() => setViewMode('grid')}
								className={`p-2 rounded-md ${
									viewMode === 'grid'
										? 'bg-blue-600 text-white'
										: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
								}`}
							>
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
								</svg>
							</button>
							<button
								onClick={() => setViewMode('list')}
								className={`p-2 rounded-md ${
									viewMode === 'list'
										? 'bg-blue-600 text-white'
										: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
								}`}
							>
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
								</svg>
							</button>
						</div>
					</div>
				</div>

				{/* 产品列表 */}
				{loading ? (
					<LoadingSkeleton />
				) : filteredProducts.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-6xl mb-4">🔍</div>
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
							没有找到匹配的产品
						</h3>
						<p className="text-gray-600 dark:text-gray-300">请尝试调整搜索条件或过滤器</p>
					</div>
				) : (
					<>
						{viewMode === 'grid' ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
								{currentProducts.map((product: Product) => (
									<ProductCard key={product.id} product={product} />
								))}
							</div>
						) : (
							<div className="space-y-4">
								{currentProducts.map((product: Product) => (
									<ProductListItem key={product.id} product={product} />
								))}
							</div>
						)}

						<Pagination
							currentPage={currentPage}
							totalPages={totalPages}
							startIndex={startIndex}
							endIndex={endIndex}
							totalItems={filteredProducts.length}
							onPageChange={handlePageChange}
						/>
					</>
				)}

				{/* 返回顶部按钮 */}
				<button
					onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
					className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
				>
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 10l7-7m0 0l7 7m-7-7v18"
						/>
					</svg>
				</button>

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
