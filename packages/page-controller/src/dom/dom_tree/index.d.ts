import type { FlatDomTree } from './type'

interface DomTreeArgs {
	doHighlightElements?: boolean
	focusHighlightIndex?: number
	viewportExpansion?: number
	debugMode?: boolean
	interactiveBlacklist?: Element[]
	interactiveWhitelist?: Element[]
	highlightOpacity?: number
	highlightLabelOpacity?: number
}

declare const domTree: (args?: DomTreeArgs) => FlatDomTree

export default domTree
