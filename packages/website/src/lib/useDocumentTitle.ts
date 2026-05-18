import { useEffect } from 'react'

const DEFAULT_TITLE = 'PageAgent - The GUI Agent Living in Your Webpage'

export function useDocumentTitle(title?: string) {
	useEffect(() => {
		document.title = title ? `${title} - PageAgent` : DEFAULT_TITLE
	}, [title])
}
