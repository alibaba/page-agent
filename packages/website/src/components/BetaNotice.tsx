import { useTranslation } from 'react-i18next'

export default function BetaNotice() {
	const { t } = useTranslation('common')

	return (
		<div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-8">
			<div className="flex items-start">
				<div className="shrink-0">
					<span className="text-xl">🚧</span>
				</div>
				<div className="ml-3">
					<h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
						{t('beta_notice.title')}
					</h3>
					<p className="text-sm text-orange-700 dark:text-orange-300">{t('beta_notice.content')}</p>
				</div>
			</div>
		</div>
	)
}
