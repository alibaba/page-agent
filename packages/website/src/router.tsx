import { Route, Switch } from 'wouter'

import DocsLayout from './components/DocsLayout'
import Header from './components/Header'
// Features pages
import CustomTools from './docs/features/custom-tools/page'
import DataMasking from './docs/features/data-masking/page'
import KnowledgeInjection from './docs/features/knowledge-injection/page'
import ModelIntegration from './docs/features/model-integration/page'
import SecurityPermissions from './docs/features/security-permissions/page'
import BestPractices from './docs/integration/best-practices/page'
// Integration pages
import CdnSetup from './docs/integration/cdn-setup/page'
import Configuration from './docs/integration/configuration/page'
import ThirdPartyAgent from './docs/integration/third-party-agent/page'
import Limitations from './docs/introduction/limitations/page'
// Introduction pages
import Overview from './docs/introduction/overview/page'
import QuickStart from './docs/introduction/quick-start/page'
import HomePage from './page'

export default function Router() {
	return (
		<Switch>
			{/* Home page */}
			<Route path="/" component={HomePage} />

			{/* Documentation pages with layout */}
			<Route path="/docs/introduction/overview">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Overview />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/introduction/quick-start">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<QuickStart />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/introduction/limitations">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Limitations />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/security-permissions">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<SecurityPermissions />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/custom-tools">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<CustomTools />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/data-masking">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<DataMasking />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/knowledge-injection">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<KnowledgeInjection />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/model-integration">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<ModelIntegration />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/cdn-setup">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<CdnSetup />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/configuration">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Configuration />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/best-practices">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<BestPractices />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/third-party-agent">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<ThirdPartyAgent />
					</DocsLayout>
				</div>
			</Route>

			{/* 404 page */}
			<Route>
				<div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
					<div className="text-center">
						<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">404</h1>
						<p className="text-xl text-gray-600 dark:text-gray-300">页面未找到</p>
					</div>
				</div>
			</Route>
		</Switch>
	)
}
