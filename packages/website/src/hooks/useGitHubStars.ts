import { useEffect, useState } from 'react'

const STATS_URL = 'https://page-agent.github.io/gh-stats/stats.json'

let cached: number | null = null

export function useGitHubStars() {
	const [stars, setStars] = useState(cached)

	useEffect(() => {
		if (cached !== null) return
		fetch(STATS_URL)
			.then((r) => r.json())
			.then((data) => {
				cached = data.stargazers_count ?? null
				setStars(cached)
			})
			.catch(() => {})
	}, [])

	return stars
}

export function formatStars(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
	return String(n)
}
