import { Suspense, lazy, useLayoutEffect } from 'react'
import { Route, Switch, useLocation } from 'wouter'

import Footer from './components/Footer'
import Header from './components/Header'
import { useLanguage } from './i18n/context'
import HomePage from './pages/Home'
import DocsLayout from './pages/docs/Layout'

const DocsPages = lazy(() => import('./pages/docs/index'))

// Prefetch docs chunk during idle time so navigation feels instant
if (typeof requestIdleCallback !== 'undefined') {
	requestIdleCallback(() => import('./pages/docs/index'))
}

function ScrollToTop() {
	const [pathname] = useLocation()
	useLayoutEffect(() => {
		window.scrollTo(0, 0)
	}, [pathname])
	return null
}

function DocsLoadingFallback() {
	const { isZh } = useLanguage()
	return (
		<DocsLayout>
			<div className="flex items-center gap-3 py-12 text-gray-500 dark:text-gray-400">
				<div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
				{isZh ? '文档加载中...' : 'Loading documentation...'}
			</div>
		</DocsLayout>
	)
}

export default function Router() {
	return (
		<div className="flex min-h-screen flex-col">
			<Header />
			<Suspense>
				<ScrollToTop />
				<Switch>
					<Route path="/">
						<main
							id="main-content"
							className="flex-1 bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800"
						>
							<HomePage />
						</main>
					</Route>

					<Route path="/docs" nest>
						<div className="flex-1 bg-white dark:bg-gray-900">
							<Suspense fallback={<DocsLoadingFallback />}>
								<DocsPages />
							</Suspense>
						</div>
					</Route>

					<Route>
						<div className="flex-1 bg-white dark:bg-gray-900 flex items-center justify-center">
							<div className="text-center">
								<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">404</h1>
								<p className="text-xl text-gray-600 dark:text-gray-300">Page not found</p>
							</div>
						</div>
					</Route>
				</Switch>
			</Suspense>
			<Footer />
		</div>
	)
}
