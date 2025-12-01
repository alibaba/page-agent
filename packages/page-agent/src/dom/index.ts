import { VIEWPORT_EXPANSION } from '../config/constants'
import domTree from './dom_tree/index'
import {
	ElementDomNode,
	FlatDomTree,
	InteractiveElementDomNode,
	TextDomNode,
} from './dom_tree/type'

export interface DomConfig {
	interactiveBlacklist?: (Element | (() => Element))[]
	interactiveWhitelist?: (Element | (() => Element))[]
	include_attributes?: string[]
	highlightOpacity?: number
	highlightLabelOpacity?: number
}

/**
 * 用于检测可交互元素是否是新出现的。
 */
const newElementsCache = new WeakMap<HTMLElement, string>()

export function getFlatTree(config: DomConfig): FlatDomTree {
	const interactiveBlacklist = [] as Element[]
	for (const item of config.interactiveBlacklist || []) {
		if (typeof item === 'function') {
			interactiveBlacklist.push(item())
		} else {
			interactiveBlacklist.push(item)
		}
	}

	const interactiveWhitelist = [] as Element[]
	for (const item of config.interactiveWhitelist || []) {
		if (typeof item === 'function') {
			interactiveWhitelist.push(item())
		} else {
			interactiveWhitelist.push(item)
		}
	}

	const elements = domTree({
		doHighlightElements: true,
		debugMode: true,
		focusHighlightIndex: -1,
		viewportExpansion: VIEWPORT_EXPANSION,
		interactiveBlacklist,
		interactiveWhitelist,
		highlightOpacity: config.highlightOpacity ?? 0.0,
		highlightLabelOpacity: config.highlightLabelOpacity ?? 0.1,
	}) as FlatDomTree

	const currentUrl = window.location.href

	/**
	 * 标记新出现的元素
	 * @todo browser-use 使用 hash(位置，属性等信息) 来判断是否同一个元素，
	 *       能够解决 1. 元素被删除后重新添加 2. 页面卸载 等问题。
	 *       这里先简单做.
	 */
	for (const nodeId in elements.map) {
		const node = elements.map[nodeId]
		if (node.isInteractive && node.ref) {
			const ref = node.ref as HTMLElement
			// @note 这样太严格，元素是可以跨页面存在的
			// if (newElementsCache.get(ref) !== currentUrl) {
			if (!newElementsCache.has(ref)) {
				newElementsCache.set(ref, currentUrl)
				node.isNew = true
			}
		}
	}

	return elements
}

/**
 * elementsToString 内部使用的类型
 */
interface TreeNode {
	type: 'text' | 'element'
	parent: TreeNode | null
	children: TreeNode[]
	isVisible: boolean
	// Text node properties
	text?: string
	// Element node properties
	tagName?: string
	attributes?: Record<string, string>
	isInteractive?: boolean
	isTopElement?: boolean
	isNew?: boolean
	highlightIndex?: number
	extra?: Record<string, any>
}

/**
 * 对应 python 中的 views::clickable_elements_to_string,
 * 将 dom 信息处理成适合 llm 阅读的文本格式
 * @形如
 * ``` text
 * [0]<a aria-label=page-agent.js 首页 />
 * [1]<div >P />
 * [2]<div >page-agent.js
 * UI Agent in your webpage />
 * [3]<a >文档 />
 * [4]<a aria-label=查看源码（在新窗口打开）>源码 />
 * UI Agent in your webpage
 * 用户输入需求，AI 理解页面并自动操作。
 * [5]<a role=button>快速开始 />
 * [6]<a role=button>查看文档 />
 * 无需后端
 * ```
 * 其中可交互元素用序号标出，提示llm可以用序号操作。
 * 缩进代表父子关系。
 * 普通文本则直接列出来。
 *
 * @todo 数据脱敏过滤器
 */
export function flatTreeToString(flatTree: FlatDomTree, include_attributes?: string[]): string {
	const DEFAULT_INCLUDE_ATTRIBUTES = [
		'title',
		'type',
		'checked',
		'name',
		'role',
		'value',
		'placeholder',
		'data-date-format',
		'alt',
		'aria-label',
		'aria-expanded',
		'data-state',
		'aria-checked',

		// @edit added for better form handling
		'id',
		'for',

		// for jump check
		'target',

		// absolute 定位的下拉菜单
		'aria-haspopup',
		'aria-controls',
		'aria-owns',
	]

	const includeAttrs = [...(include_attributes || []), ...DEFAULT_INCLUDE_ATTRIBUTES]

	// Helper function to cap text length
	const capTextLength = (text: string, maxLength: number): string => {
		if (text.length > maxLength) {
			return text.substring(0, maxLength) + '...'
		}
		return text
	}

	// Build tree structure from flat map
	const buildTreeNode = (nodeId: string): TreeNode | null => {
		const node = flatTree.map[nodeId]
		if (!node) return null

		if (node.type === 'TEXT_NODE') {
			const textNode = node as TextDomNode
			return {
				type: 'text',
				text: textNode.text,
				isVisible: textNode.isVisible,
				parent: null,
				children: [],
			}
		} else {
			const elementNode = node as ElementDomNode
			const children: TreeNode[] = []

			if (elementNode.children) {
				for (const childId of elementNode.children) {
					const child = buildTreeNode(childId)
					if (child) {
						child.parent = null // Will be set later
						children.push(child)
					}
				}
			}

			return {
				type: 'element',
				tagName: elementNode.tagName,
				attributes: elementNode.attributes ?? {},
				isVisible: elementNode.isVisible ?? false,
				isInteractive: elementNode.isInteractive ?? false,
				isTopElement: elementNode.isTopElement ?? false,
				isNew: elementNode.isNew ?? false,
				highlightIndex: elementNode.highlightIndex,
				parent: null,
				children,
				extra: elementNode.extra ?? {},
			}
		}
	}

	// Set parent references
	const setParentReferences = (node: TreeNode, parent: TreeNode | null = null) => {
		node.parent = parent
		for (const child of node.children) {
			setParentReferences(child, node)
		}
	}

	// Build root node
	const rootNode = buildTreeNode(flatTree.rootId)
	if (!rootNode) return ''

	setParentReferences(rootNode)

	// Helper to check if text node has parent with highlight index
	const hasParentWithHighlightIndex = (node: TreeNode): boolean => {
		let current = node.parent
		while (current) {
			if (current.type === 'element' && current.highlightIndex !== undefined) {
				return true
			}
			current = current.parent
		}
		return false
	}

	// Helper to check if parent is top element
	// const isParentTopElement = (node: TreeNode): boolean => {
	// 	return node.parent?.type === 'element' && node.parent.isTopElement === true
	// }

	// Main processing function
	const processNode = (node: TreeNode, depth: number, result: string[]): void => {
		let nextDepth = depth
		const depthStr = '\t'.repeat(depth)

		if (node.type === 'element') {
			// Add element with highlight_index
			if (node.highlightIndex !== undefined) {
				nextDepth += 1

				const text = getAllTextTillNextClickableElement(node)
				let attributesHtmlStr = ''

				if (includeAttrs.length > 0 && node.attributes) {
					const attributesToInclude: Record<string, string> = {}

					// Filter attributes
					for (const key of includeAttrs) {
						const value = node.attributes[key]
						if (value && value.trim() !== '') {
							attributesToInclude[key] = value.trim()
						}
					}

					// Remove duplicate values (for attributes longer than 5 chars)
					const orderedKeys = includeAttrs.filter((key) => key in attributesToInclude)
					if (orderedKeys.length > 1) {
						const keysToRemove = new Set<string>()
						const seenValues: Record<string, string> = {}

						for (const key of orderedKeys) {
							const value = attributesToInclude[key]
							if (value.length > 5) {
								if (value in seenValues) {
									keysToRemove.add(key)
								} else {
									seenValues[value] = key
								}
							}
						}

						for (const key of keysToRemove) {
							delete attributesToInclude[key]
						}
					}

					// Remove role if it matches tagName
					if (attributesToInclude.role === node.tagName) {
						delete attributesToInclude.role
					}

					// Remove attributes that duplicate text content
					const attrsToRemoveIfTextMatches = ['aria-label', 'placeholder', 'title']
					for (const attr of attrsToRemoveIfTextMatches) {
						if (
							attributesToInclude[attr] &&
							attributesToInclude[attr].toLowerCase().trim() === text.toLowerCase().trim()
						) {
							delete attributesToInclude[attr]
						}
					}

					if (Object.keys(attributesToInclude).length > 0) {
						attributesHtmlStr = Object.entries(attributesToInclude)
							.map(([key, value]) => `${key}=${capTextLength(value, 20)}`)
							.join(' ')
					}
				}

				// Build the line
				const highlightIndicator = node.isNew
					? `*[${node.highlightIndex}]`
					: `[${node.highlightIndex}]`
				let line = `${depthStr}${highlightIndicator}<${node.tagName ?? ''}`

				if (attributesHtmlStr) {
					line += ` ${attributesHtmlStr}`
				}

				/**
				 * @edit scrollable 数据
				 */
				if (node.extra) {
					if (node.extra.scrollable) {
						let scrollDataText = ''
						if (node.extra.scrollData?.left)
							scrollDataText += `left=${node.extra.scrollData.left}, `
						if (node.extra.scrollData?.top) scrollDataText += `top=${node.extra.scrollData.top}, `
						if (node.extra.scrollData?.right)
							scrollDataText += `right=${node.extra.scrollData.right}, `
						if (node.extra.scrollData?.bottom)
							scrollDataText += `bottom=${node.extra.scrollData.bottom}`

						line += ` data-scrollable="${scrollDataText}"`
					}
				}

				if (text) {
					const trimmedText = text.trim()
					if (!attributesHtmlStr) {
						line += ' '
					}
					line += `>${trimmedText}`
				} else if (!attributesHtmlStr) {
					line += ' '
				}

				line += ' />'
				result.push(line)
			}

			// Process children regardless
			for (const child of node.children) {
				processNode(child, nextDepth, result)
			}
		} else if (node.type === 'text') {
			// Add text only if it doesn't have a highlighted parent
			if (hasParentWithHighlightIndex(node)) {
				return
			}

			if (
				node.parent &&
				node.parent.type === 'element' &&
				node.parent.isVisible &&
				node.parent.isTopElement
			) {
				result.push(`${depthStr}${node.text ?? ''}`)
			}
		}
	}

	const result: string[] = []
	processNode(rootNode, 0, result)
	return result.join('\n')
}

// Get all text until next clickable element
export const getAllTextTillNextClickableElement = (node: TreeNode, maxDepth = -1): string => {
	const textParts: string[] = []

	const collectText = (currentNode: TreeNode, currentDepth: number) => {
		if (maxDepth !== -1 && currentDepth > maxDepth) {
			return
		}

		// Skip this branch if we hit a highlighted element (except for the current node)
		if (
			currentNode.type === 'element' &&
			currentNode !== node &&
			currentNode.highlightIndex !== undefined
		) {
			return
		}

		if (currentNode.type === 'text' && currentNode.text) {
			textParts.push(currentNode.text)
		} else if (currentNode.type === 'element') {
			for (const child of currentNode.children) {
				collectText(child, currentDepth + 1)
			}
		}
	}

	collectText(node, 0)
	return textParts.join('\n').trim()
}

export function getSelectorMap(flatTree: FlatDomTree): Map<number, InteractiveElementDomNode> {
	const selectorMap = new Map<number, InteractiveElementDomNode>()

	const keys = Object.keys(flatTree.map)
	for (const key of keys) {
		const node = flatTree.map[key]
		if (node.isInteractive && typeof node.highlightIndex === 'number') {
			selectorMap.set(node.highlightIndex, node as InteractiveElementDomNode)
		}
	}

	return selectorMap
}

export function getElementTextMap(simplifiedHTML: string) {
	const lines = simplifiedHTML
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
	const elementTextMap = new Map<number, string>()
	for (const line of lines) {
		const regex = /^\[(\d+)\]<[^>]+>([^<]*)/
		const match = regex.exec(line)
		if (match) {
			const index = parseInt(match[1], 10)
			elementTextMap.set(index, line)
		}
	}

	return elementTextMap
}

export function cleanUpHighlights() {
	const cleanupFunctions = (window as any)._highlightCleanupFunctions || []
	for (const cleanup of cleanupFunctions) {
		if (typeof cleanup === 'function') {
			cleanup()
		}
	}

	;(window as any)._highlightCleanupFunctions = []
}

// 监听 URL 的任何变化，立刻清空 highLights
window.addEventListener('popstate', () => {
	// console.log('URL changed (popstate), highlights cleaned up.')
	cleanUpHighlights()
})
window.addEventListener('hashchange', () => {
	// console.log('URL changed (hashchange), highlights cleaned up.')
	cleanUpHighlights()
})
window.addEventListener('beforeunload', () => {
	// console.log('Page is unloading, highlights cleaned up.')
	cleanUpHighlights()
})

const navigation = (window as any).navigation
if (navigation && typeof navigation.addEventListener === 'function') {
	navigation.addEventListener('navigate', () => {
		// console.log('Navigation event detected, highlights cleaned up.')
		cleanUpHighlights()
	})
} else {
	// 定时器
	let currentUrl = window.location.href
	setInterval(() => {
		if (window.location.href !== currentUrl) {
			currentUrl = window.location.href
			// console.log('URL changed (interval), highlights cleaned up.')
			cleanUpHighlights()
		}
	}, 500)
}
