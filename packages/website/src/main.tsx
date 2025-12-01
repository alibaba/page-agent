import { createRoot } from 'react-dom/client'
import { Route, Router, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'

import './i18n/config'
import './i18n/types'
import { default as PagesRouter } from './router.tsx'
import { default as TestPagesRouter } from './test-pages/router.tsx'

import './index.css'

createRoot(document.getElementById('root')!).render(
	<Router hook={useHashLocation}>
		<Switch>
			<Route path="/test-pages" component={TestPagesRouter} nest />
			<Route path="/" component={PagesRouter} nest />
		</Switch>
	</Router>
)
