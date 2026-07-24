import { useEffect } from 'react'

const DEFAULT_TITLE = 'PageOS - The GUI Agent Living in Your Webpage'

export function useDocumentTitle(title?: string) {
	useEffect(() => {
		document.title = title ? `${title} - PageOS` : DEFAULT_TITLE
	}, [title])
}
