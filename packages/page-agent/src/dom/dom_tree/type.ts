// FlatDomTree: 扁平化 DOM 树结构，适用于高效存储和遍历页面结构。
// 每个节点通过 map 索引，支持文本节点和元素节点，字段区分 undefined 和 false。

export interface FlatDomTree {
	rootId: string
	map: Record<string, DomNode>
}

export type DomNode = TextDomNode | ElementDomNode | InteractiveElementDomNode

export interface TextDomNode {
	type: 'TEXT_NODE'
	text: string
	isVisible: boolean
	// 其他可选字段
	[key: string]: unknown
}

export interface ElementDomNode {
	tagName: string
	attributes?: Record<string, string>
	xpath?: string
	children?: string[]
	isVisible?: boolean
	isTopElement?: boolean
	isInViewport?: boolean
	isNew?: boolean
	isInteractive?: false
	highlightIndex?: number
	extra?: Record<string, any>
	// 其他可选字段
	[key: string]: unknown
}

export interface InteractiveElementDomNode {
	tagName: string
	attributes?: Record<string, string>
	xpath?: string
	children?: string[]
	isVisible?: boolean
	isTopElement?: boolean
	isInViewport?: boolean
	isInteractive: true
	highlightIndex: number
	/**
	 * 可交互元素的 dom 引用
	 */
	ref: HTMLElement
	// 其他可选字段
	[key: string]: unknown
}
