import { beforeEach, describe, expect, it, vi } from 'vitest'

import domTree from './dom_tree/index.js'
import { type DomConfig, getFlatTree } from './index'

vi.mock('./dom_tree/index.js', () => ({
	default: vi.fn(() => ({ map: {}, rootId: '0' })),
}))

const domTreeMock = vi.mocked(domTree)

/**
 * The full args object getFlatTree passes to the DOM engine for an empty config.
 * Every case below is asserted against this object plus its own overrides,
 * so an accidentally added or dropped arg fails the whole table.
 */
const DEFAULT_ARGS = {
	doHighlightElements: true,
	debugMode: true,
	focusHighlightIndex: -1,
	viewportExpansion: -1,
	interactiveBlacklist: [],
	interactiveWhitelist: [],
	highlightOpacity: 0,
	highlightLabelOpacity: 0.1,
	highlightLabelTextOpacity: 1,
}

const cases: { name: string; config: DomConfig; expected: Partial<typeof DEFAULT_ARGS> }[] = [
	{
		name: 'empty config falls back to painted highlights with opaque label text',
		config: {},
		expected: {},
	},
	{
		name: 'doHighlightElements: false disables painting',
		config: { doHighlightElements: false },
		expected: { doHighlightElements: false },
	},
	{
		name: 'doHighlightElements: true keeps painting',
		config: { doHighlightElements: true },
		expected: { doHighlightElements: true },
	},
	{
		name: 'highlightLabelTextOpacity: 0 is kept, not replaced by the default',
		config: { highlightLabelTextOpacity: 0 },
		expected: { highlightLabelTextOpacity: 0 },
	},
	{
		name: 'highlightLabelTextOpacity: 1 passes through',
		config: { highlightLabelTextOpacity: 1 },
		expected: { highlightLabelTextOpacity: 1 },
	},
	{
		name: 'highlightOpacity: 0 is kept',
		config: { highlightOpacity: 0 },
		expected: { highlightOpacity: 0 },
	},
	{
		name: 'highlightOpacity: 1 passes through',
		config: { highlightOpacity: 1 },
		expected: { highlightOpacity: 1 },
	},
	{
		name: 'highlightLabelOpacity: 0 is kept, not replaced by the default',
		config: { highlightLabelOpacity: 0 },
		expected: { highlightLabelOpacity: 0 },
	},
	{
		name: 'highlightLabelOpacity: 1 passes through',
		config: { highlightLabelOpacity: 1 },
		expected: { highlightLabelOpacity: 1 },
	},
	{
		name: 'all three opacities at 0 hide the whole overlay',
		config: { highlightOpacity: 0, highlightLabelOpacity: 0, highlightLabelTextOpacity: 0 },
		expected: { highlightOpacity: 0, highlightLabelOpacity: 0, highlightLabelTextOpacity: 0 },
	},
	{
		name: 'viewportExpansion: 0 passes through',
		config: { viewportExpansion: 0 },
		expected: { viewportExpansion: 0 },
	},
	{
		name: 'viewportExpansion: 200 passes through',
		config: { viewportExpansion: 200 },
		expected: { viewportExpansion: 200 },
	},
]

describe('getFlatTree', () => {
	beforeEach(() => {
		domTreeMock.mockClear()
	})

	it.each(cases)('$name', ({ config, expected }) => {
		getFlatTree(config)

		expect(domTreeMock).toHaveBeenCalledWith({ ...DEFAULT_ARGS, ...expected })
	})

	it('resolves lazy blacklist and whitelist entries', () => {
		const blacklisted = document.createElement('div')
		const whitelisted = document.createElement('span')

		getFlatTree({
			interactiveBlacklist: [() => blacklisted],
			interactiveWhitelist: [whitelisted],
		})

		expect(domTreeMock).toHaveBeenCalledWith({
			...DEFAULT_ARGS,
			interactiveBlacklist: [blacklisted],
			interactiveWhitelist: [whitelisted],
		})
	})
})
