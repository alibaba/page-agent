import { useTranslation } from 'react-i18next'

export default function Overview() {
	const { t } = useTranslation('docs')

	return (
		<article>
			{/* 头图 */}
			<figure className="mb-8 rounded-xl overflow-hidden">
				<img
					src="https://img.alicdn.com/imgextra/i1/O1CN01RY0Wvh26ATVeDIX7v_!!6000000007621-0-tps-1672-512.jpg"
					alt="page-agent"
					className="w-full h-64 object-cover"
				/>
			</figure>

			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-4">{t('overview.title')}</h1>
				<p className="text-xl text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
					{t('overview.subtitle')}
				</p>

				{/* Status Badges */}
				<div className="flex flex-wrap gap-2 items-center">
					<a
						href="https://www.npmjs.com/package/page-agent"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img src="https://badge.fury.io/js/page-agent.svg" alt="npm version" />
					</a>
					<a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">
						<img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" />
					</a>
					<a href="http://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer">
						<img
							src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg"
							alt="TypeScript"
						/>
					</a>
					<a
						href="https://www.npmjs.com/package/page-agent"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img src="https://img.shields.io/npm/dt/page-agent.svg" alt="Downloads" />
					</a>
					<a
						href="https://bundlephobia.com/package/page-agent"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img src="https://img.shields.io/bundlephobia/minzip/page-agent" alt="Bundle Size" />
					</a>
					<a href="https://github.com/alibaba/page-agent" target="_blank" rel="noopener noreferrer">
						<img
							src="https://img.shields.io/github/stars/alibaba/page-agent.svg"
							alt="GitHub stars"
						/>
					</a>
				</div>
			</div>

			<section>
				<h2 className="text-2xl font-bold mb-4">{t('overview.what_is')}</h2>

				<p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed ">
					{t('overview.what_is_desc')}
				</p>
			</section>

			<section>
				<h2 className="text-2xl font-bold mb-3">{t('overview.features_title')}</h2>

				<div className="grid md:grid-cols-2 gap-4 mb-8" role="list">
					<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
							{t('overview.feature_dom.title')}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">{t('overview.feature_dom.desc')}</p>
					</div>

					<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
							{t('overview.feature_secure.title')}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">{t('overview.feature_secure.desc')}</p>
					</div>

					<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
							{t('overview.feature_backend.title')}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">{t('overview.feature_backend.desc')}</p>
					</div>

					<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
							{t('overview.feature_accessible.title')}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">
							{t('overview.feature_accessible.desc')}
						</p>
					</div>
				</div>

				<h2 className="text-2xl font-bold mb-4">{t('overview.vs_browser_use')}</h2>

				<div className="overflow-x-auto mb-8">
					<table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
						<thead>
							<tr className="bg-gray-50 dark:bg-gray-800">
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									{t('overview.table_feature')}
								</th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									page-agent
								</th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									browser-use
								</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{t('overview.table_deployment')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_deployment_pa')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_deployment_bu')}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{t('overview.table_scope')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_scope_pa')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_scope_bu')}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{t('overview.table_user')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_user_pa')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_user_bu')}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{t('overview.table_scenario')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_scenario_pa')}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{t('overview.table_scenario_bu')}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h2 className="text-2xl font-bold mb-4">{t('overview.use_cases_title')}</h2>

				<ul className="space-y-4 mb-8">
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							1
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{t('overview.use_case1_title')}</strong> {t('overview.use_case1_desc')}
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							2
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{t('overview.use_case2_title')}</strong> {t('overview.use_case2_desc')}
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							3
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{t('overview.use_case3_title')}</strong> {t('overview.use_case3_desc')}
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							4
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{t('overview.use_case4_title')}</strong> {t('overview.use_case4_desc')}
						</div>
					</li>
				</ul>
			</section>
		</article>
	)
}
