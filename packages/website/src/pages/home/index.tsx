import { Suspense, lazy } from 'react'

import { useDocumentTitle } from '@/lib/useDocumentTitle'

import HeroSection from './HeroSection'

const FeaturesSection = lazy(() => import('./FeaturesSection'))
const ScenariosSection = lazy(() => import('./ScenariosSection'))
const OneMoreThingSection = lazy(() => import('./OneMoreThingSection'))

export default function HomePage() {
	useDocumentTitle()

	return (
		<>
			<HeroSection />
			<Suspense
				fallback={
					<div className="flex items-center justify-center gap-3 py-20 text-gray-400">
						<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
						Loading...
					</div>
				}
			>
				<FeaturesSection />
				<ScenariosSection />
				<OneMoreThingSection />
			</Suspense>
		</>
	)
}
