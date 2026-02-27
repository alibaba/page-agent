import { siGithub } from 'simple-icons'

import { useLanguage } from '@/i18n/context'

export default function Footer() {
	const { isZh } = useLanguage()

	return (
		<footer
			className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
			role="contentinfo"
		>
			<div className="max-w-7xl mx-auto px-6 py-6">
				<div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
					<p className="text-gray-600 dark:text-gray-300 text-sm">
						© 2026 page-agent. All rights reserved.
					</p>
					<div className="flex items-center space-x-6">
						<a
							href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 text-sm"
						>
							{isZh ? '使用条款与隐私' : 'Terms & Privacy'}
						</a>
						<a
							href="https://github.com/alibaba/page-agent"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
							aria-label={isZh ? '访问 GitHub 仓库' : 'Visit GitHub repository'}
						>
							<svg
								role="img"
								viewBox="0 0 24 24"
								className="w-5 h-5 fill-current"
								aria-hidden="true"
							>
								<path d={siGithub.path} />
							</svg>
						</a>
					</div>
				</div>
			</div>
		</footer>
	)
}
