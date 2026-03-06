import { describe, expect, it } from 'vitest'

import { parseLLMConfig } from '../index'

describe('parseLLMConfig', () => {
	it('throws if baseURL is missing', () => {
		expect(() => parseLLMConfig({ baseURL: '', apiKey: 'k', model: 'm' })).toThrow(
			'LLM configuration required'
		)
	})

	it('throws if apiKey is missing', () => {
		expect(() => parseLLMConfig({ baseURL: 'http://x', apiKey: '', model: 'm' })).toThrow(
			'LLM configuration required'
		)
	})

	it('throws if model is missing', () => {
		expect(() => parseLLMConfig({ baseURL: 'http://x', apiKey: 'k', model: '' })).toThrow(
			'LLM configuration required'
		)
	})

	it('fills defaults for temperature, maxRetries, customFetch', () => {
		const config = parseLLMConfig({
			baseURL: 'http://localhost',
			apiKey: 'test-key',
			model: 'gpt-4',
		})
		expect(config.baseURL).toBe('http://localhost')
		expect(config.apiKey).toBe('test-key')
		expect(config.model).toBe('gpt-4')
		expect(config.temperature).toBe(0.7)
		expect(config.maxRetries).toBe(2)
		expect(typeof config.customFetch).toBe('function')
	})

	it('respects explicit temperature and maxRetries', () => {
		const config = parseLLMConfig({
			baseURL: 'http://localhost',
			apiKey: 'key',
			model: 'gpt-4',
			temperature: 0.2,
			maxRetries: 5,
		})
		expect(config.temperature).toBe(0.2)
		expect(config.maxRetries).toBe(5)
	})
})
