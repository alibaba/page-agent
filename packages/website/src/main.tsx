import { createRoot } from 'react-dom/client'
import { Router } from 'wouter'

import { LanguageProvider } from './i18n/context'
import { default as PagesRouter } from './router'

import './index.css'

// Redirect legacy hash routes (e.g. /#/docs/foo) to clean paths
const { hash } = window.location
if (hash.length > 1 && hash.includes('/')) {
	const path = hash.replace(/^#\/?/, '/')
	history.replaceState(null, '', '/page-agent' + path)
}

createRoot(document.getElementById('root')!).render(
	<LanguageProvider>
		<Router base="/page-agent">
			<PagesRouter />
		</Router>
	</LanguageProvider>
)
