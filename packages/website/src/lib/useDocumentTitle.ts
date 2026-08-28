import { useEffect } from 'react'

const DEFAULT_TITLE = 'EBAgent - The GUI Agent Living in Your Webpage'

export function useDocumentTitle(title?: string) {
	useEffect(() => {
		document.title = title ? `${title} - EBAgent` : DEFAULT_TITLE
	}, [title])
}
