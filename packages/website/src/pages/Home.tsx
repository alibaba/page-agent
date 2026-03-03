import { Suspense, lazy } from 'react'

import HeroSection from './home/HeroSection'

const FeaturesSection = lazy(() => import('./home/FeaturesSection'))
const ScenariosSection = lazy(() => import('./home/ScenariosSection'))
const OneMoreThingSection = lazy(() => import('./home/OneMoreThingSection'))

export default function HomePage() {
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
