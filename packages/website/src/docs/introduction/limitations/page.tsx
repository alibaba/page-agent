import { useTranslation } from 'react-i18next'

export default function LimitationsPage() {
	const { t } = useTranslation('docs')

	return (
		<div className="max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
					{t('limitations.title')}
				</h1>
				<p className="text-xl text-gray-600 dark:text-gray-300">{t('limitations.subtitle')}</p>
			</div>

			<div className="prose prose-lg dark:prose-invert max-w-none">
				<h2 className="text-2xl font-bold mb-3">{t('limitations.page_support')}</h2>
				<div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mb-6">
					<h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
						{t('limitations.spa_limit_title')}
					</h3>
					<ul className="text-blue-700 dark:text-blue-300 space-y-2">
						<li>{t('limitations.spa_limit_1')}</li>
						<li>{t('limitations.spa_limit_2')}</li>
						<li>{t('limitations.spa_limit_3')}</li>
					</ul>
				</div>

				<h2 className="text-2xl font-bold mb-3">{t('limitations.interaction_limits')}</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
					<h3 className="font-semibold mb-4">{t('limitations.supported_ops')}</h3>
					<div className="grid md:grid-cols-2 gap-4 mb-6">
						<div className="space-y-2">
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{t('limitations.op_click')}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{t('limitations.op_input')}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{t('limitations.op_scroll')}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{t('limitations.op_submit')}</span>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{t('limitations.op_select')}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{t('limitations.op_focus')}</span>
							</div>
						</div>
					</div>

					<h3 className="font-semibold mb-4">{t('limitations.unsupported_ops')}</h3>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{t('limitations.op_hover')}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{t('limitations.op_drag')}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{t('limitations.op_context')}</span>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{t('limitations.op_draw')}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{t('limitations.op_keyboard')}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{t('limitations.op_position')}</span>
							</div>
						</div>
					</div>
				</div>

				<h2 className="text-2xl font-bold mb-3">{t('limitations.understanding_limits')}</h2>
				<div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-6">
					<h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
						{t('limitations.no_vision_title')}
					</h3>
					<p className="text-red-700 dark:text-red-300 mb-3">{t('limitations.no_vision_desc')}</p>
					<ul className="text-red-700 dark:text-red-300 space-y-1">
						<li>{t('limitations.no_vision_1')}</li>
						<li>{t('limitations.no_vision_2')}</li>
						<li>{t('limitations.no_vision_3')}</li>
						<li>{t('limitations.no_vision_4')}</li>
					</ul>
				</div>

				<h2 className="text-2xl font-bold mb-3">{t('limitations.website_requirements')}</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
					<div className="space-y-4">
						<div>
							<h3 className="font-semibold mb-2">{t('limitations.req_semantic_title')}</h3>
							<p className="text-gray-600 dark:text-gray-300">
								{t('limitations.req_semantic_desc')}
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">{t('limitations.req_ux_title')}</h3>
							<p className="text-gray-600 dark:text-gray-300">{t('limitations.req_ux_desc')}</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">{t('limitations.req_env_title')}</h3>
							<p className="text-gray-600 dark:text-gray-300">{t('limitations.req_env_desc')}</p>
						</div>
					</div>
				</div>

				<h2>{t('limitations.future')}</h2>
				<div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4">
					<h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
						{t('limitations.future_title')}
					</h3>
					<ul className="text-green-700 dark:text-green-300 space-y-1">
						<li>{t('limitations.future_1')}</li>
						<li>{t('limitations.future_2')}</li>
						<li>{t('limitations.future_3')}</li>
						<li>{t('limitations.future_4')}</li>
					</ul>
				</div>
			</div>
		</div>
	)
}
