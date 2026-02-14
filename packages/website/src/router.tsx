import { Suspense, lazy, useLayoutEffect } from 'react'
import { Route, Switch, useLocation } from 'wouter'

import HomePage from './pages/Home'
import DocsPages from './pages/docs/index'

// const DocsPages = lazy(() => import('./pages/docs/index'))

function ScrollToTop() {
	const [pathname] = useLocation()
	useLayoutEffect(() => {
		window.scrollTo(0, 0)
	}, [pathname])
	return null
}

export default function Router() {
	return (
		<Suspense>
			<ScrollToTop />
			<Switch>
				{/* Home page */}
				<Route path="/">
					<HomePage />
				</Route>

				{/* All docs pages */}
				<Route path="/docs" nest>
					<DocsPages />
				</Route>

				{/* 404 */}
				<Route>
					<div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
						<div className="text-center">
							<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">404</h1>
							<p className="text-xl text-gray-600 dark:text-gray-300">页面未找到</p>
						</div>
					</div>
				</Route>
			</Switch>
		</Suspense>
	)
}
