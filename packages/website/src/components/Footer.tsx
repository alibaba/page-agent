import { siGithub, siX } from 'simple-icons'

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
					<div className="text-gray-600 dark:text-gray-300 text-sm text-center md:text-left">
						<p>
							<a
								href="https://x.com/simonluvramen"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-block bg-[linear-gradient(60deg,#39b6ff_0%,#bd45fb_33%,#ff5733_66%,#ffd600_100%)] bg-clip-text text-xs leading-none text-transparent font-mono transition-opacity duration-200 hover:opacity-85"
							>
								Simon.
							</a>
						</p>
						<p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">
							© 2026 page-agent. All rights reserved.
						</p>
					</div>

					<div className="flex items-center">
						<a
							href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 text-sm mr-4"
						>
							{isZh ? '使用条款与隐私' : 'Terms & Privacy'}
						</a>
						<a
							href="https://x.com/simonluvramen"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 mr-4"
							aria-label="X (Twitter)"
						>
							<svg
								role="img"
								viewBox="0 0 24 24"
								className="w-4 h-4 fill-current"
								aria-hidden="true"
							>
								<path d={siX.path} />
							</svg>
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
