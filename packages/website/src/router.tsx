import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { Route, Switch, useLocation } from 'wouter'

import Footer from './components/Footer'
import Header from './components/Header'
import HomePage from './pages/home'

const docsImport = () => import('./pages/docs')
const DocsPages = lazy(docsImport)

function ScrollToTop() {
	const [pathname] = useLocation()
	useLayoutEffect(() => {
		window.scrollTo(0, 0)
	}, [pathname])
	return null
}

export default function Router() {
	useEffect(() => {
		const schedule = globalThis.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1))
		const cancel = globalThis.cancelIdleCallback ?? clearTimeout
		const id = schedule(() => docsImport())
		return () => cancel(id)
	}, [])

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
						<div className="flex-1 bg-background">
							<Suspense
								fallback={
									<div className="flex items-center justify-center gap-3 py-20 text-gray-400">
										<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
										Loading...
									</div>
								}
							>
								<DocsPages />
							</Suspense>
						</div>
					</Route>

					<Route>
						<div className="flex-1 bg-background flex items-center justify-center">
							<div className="text-center">
								<h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
								<p className="text-xl text-muted-foreground">Page not found</p>
							</div>
						</div>
					</Route>
				</Switch>
			</Suspense>
			<Footer />
		</div>
	)
}
