import { Suspense } from 'react'
import { Route, Switch } from 'wouter'

import Footer from '../../components/Footer'
import Header from '../../components/Header'
import DocsLayout from './Layout'
import CustomUIDocs from './advanced/custom-ui/page'
import PageAgentCoreDocs from './advanced/page-agent-core/page'
// Advanced
import PageAgentDocs from './advanced/page-agent/page'
// Features
import ChromeExtension from './features/chrome-extension/page'
import Instructions from './features/custom-instructions/page'
import CustomTools from './features/custom-tools/page'
import DataMasking from './features/data-masking/page'
import Models from './features/models/page'
import BestPractices from './integration/best-practices/page'
import SecurityPermissions from './integration/security-permissions/page'
import ThirdPartyAgent from './integration/third-party-agent/page'
import Limitations from './introduction/limitations/page'
// Introduction
import Overview from './introduction/overview/page'
import QuickStart from './introduction/quick-start/page'
import Troubleshooting from './introduction/troubleshooting/page'

function DocsPage({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
			<Header />
			<DocsLayout>
				<Suspense>{children}</Suspense>
			</DocsLayout>
			<div className="mt-auto">
				<Footer />
			</div>
		</div>
	)
}

export default function DocsRouter() {
	return (
		<Switch>
			{/* Introduction */}
			<Route path="/introduction/overview">
				<DocsPage>
					<Overview />
				</DocsPage>
			</Route>
			<Route path="/introduction/quick-start">
				<DocsPage>
					<QuickStart />
				</DocsPage>
			</Route>
			<Route path="/introduction/limitations">
				<DocsPage>
					<Limitations />
				</DocsPage>
			</Route>
			<Route path="/introduction/troubleshooting">
				<DocsPage>
					<Troubleshooting />
				</DocsPage>
			</Route>

			{/* Features */}
			<Route path="/features/custom-tools">
				<DocsPage>
					<CustomTools />
				</DocsPage>
			</Route>
			<Route path="/features/data-masking">
				<DocsPage>
					<DataMasking />
				</DocsPage>
			</Route>
			<Route path="/features/custom-instructions">
				<DocsPage>
					<Instructions />
				</DocsPage>
			</Route>
			<Route path="/features/models">
				<DocsPage>
					<Models />
				</DocsPage>
			</Route>
			<Route path="/features/chrome-extension">
				<DocsPage>
					<ChromeExtension />
				</DocsPage>
			</Route>

			{/* Advanced */}
			<Route path="/advanced/page-agent">
				<DocsPage>
					<PageAgentDocs />
				</DocsPage>
			</Route>
			<Route path="/advanced/page-agent-core">
				<DocsPage>
					<PageAgentCoreDocs />
				</DocsPage>
			</Route>
			<Route path="/advanced/custom-ui">
				<DocsPage>
					<CustomUIDocs />
				</DocsPage>
			</Route>
			<Route path="/integration/security-permissions">
				<DocsPage>
					<SecurityPermissions />
				</DocsPage>
			</Route>
			<Route path="/integration/best-practices">
				<DocsPage>
					<BestPractices />
				</DocsPage>
			</Route>
			<Route path="/integration/third-party-agent">
				<DocsPage>
					<ThirdPartyAgent />
				</DocsPage>
			</Route>

			{/* Default redirect or 404 */}
			<Route path="/docs">
				<DocsPage>
					<Overview />
				</DocsPage>
			</Route>
		</Switch>
	)
}
