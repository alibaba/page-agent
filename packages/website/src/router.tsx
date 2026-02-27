import { Suspense, useLayoutEffect } from 'react'
import { Route, Switch, useLocation } from 'wouter'

import Footer from './components/Footer'
import Header from './components/Header'
import DocsPages from './pages/docs/index'
import HomeContent from './pages/home/HomeContent'

function ScrollToTop() {
	const [pathname] = useLocation()
	useLayoutEffect(() => {
		window.scrollTo(0, 0)
	}, [pathname])
	return null
}

export default function Router() {
	return (
		<>
			<Header />
			<Suspense>
				<ScrollToTop />
				<Switch>
					<Route path="/">
						<main
							id="main-content"
							className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800"
						>
							<HomeContent />
						</main>
					</Route>

					<Route path="/docs" nest>
						<div className="min-h-screen bg-white dark:bg-gray-900">
							<DocsPages />
						</div>
					</Route>

					<Route>
						<div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
							<div className="text-center">
								<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">404</h1>
								<p className="text-xl text-gray-600 dark:text-gray-300">Page not found</p>
							</div>
						</div>
					</Route>
				</Switch>
			</Suspense>
			<Footer />
		</>
	)
}
