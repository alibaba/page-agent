import Footer from '../components/Footer'
import Header from '../components/Header'
import FeaturesSection from './home/FeaturesSection'
import HeroSection from './home/HeroSection'
import OneMoreThingSection from './home/OneMoreThingSection'
import ScenariosSection from './home/ScenariosSection'

export default function HomePage() {
	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
			<Header />

			<main id="main-content">
				<HeroSection />
				<FeaturesSection />
				<ScenariosSection />
				<OneMoreThingSection />
			</main>

			<Footer />
		</div>
	)
}
