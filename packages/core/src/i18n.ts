/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * Internationalization (i18n) module for PageAgent
 * Provides multi-language support for UI strings and console messages
 */

export type Language = 'en' | 'zh-CN'

/** Supported languages in AgentConfig */
export type SupportedLanguage = 'en-US' | 'zh-CN'

export interface Translations {
	// Console messages
	observing: string
	thinking: string
	taskCompleted: string
	taskFailed: string
	taskStopped: string
	stepExceeded: string
	macroToolInput: string
	executingTool: string
	toolExecuted: string
	observation: string
	disposing: string

	// Observations/Warnings
	waitTimeWarning: string
	pageNavigated: string
	remainingStepsWarning: string
	criticalStepsWarning: string

	// Errors
	toolNotFound: string
	pageInstructionsError: string
}

const translations: Record<Language, Translations> = {
	en: {
		observing: '👀 Observing...',
		thinking: '🧠 Thinking...',
		taskCompleted: 'Task completed',
		taskFailed: 'Task failed',
		taskStopped: 'Task stopped',
		stepExceeded: 'Step count exceeded maximum limit',
		macroToolInput: 'MacroTool input',
		executingTool: 'Executing tool',
		toolExecuted: 'Tool executed for',
		observation: 'Observation:',
		disposing: 'Disposing PageAgent...',

		waitTimeWarning:
			'You have waited {seconds} seconds accumulatively. DO NOT wait any longer unless you have a good reason.',
		pageNavigated: 'Page navigated to → {url}',
		remainingStepsWarning:
			'⚠️ Only {remaining} steps remaining. Consider wrapping up or calling done with partial results.',
		criticalStepsWarning:
			'⚠️ Critical: Only {remaining} steps left! You must finish the task or call done immediately.',

		toolNotFound: 'Tool {toolName} not found',
		pageInstructionsError: '[PageAgent] Failed to execute getPageInstructions callback:',
	},
	'zh-CN': {
		observing: '👀 观察中...',
		thinking: '🧠 思考中...',
		taskCompleted: '任务完成',
		taskFailed: '任务失败',
		taskStopped: '任务已停止',
		stepExceeded: '步数超过最大限制',
		macroToolInput: 'MacroTool 输入',
		executingTool: '执行工具',
		toolExecuted: '工具执行耗时',
		observation: '观察:',
		disposing: '正在释放 PageAgent...',

		waitTimeWarning: '您已累计等待 {seconds} 秒。除非有充分理由，否则请勿继续等待。',
		pageNavigated: '页面已导航至 → {url}',
		remainingStepsWarning: '⚠️ 仅剩 {remaining} 步。请考虑完成或调用 done 返回部分结果。',
		criticalStepsWarning: '⚠️ 紧急：仅剩 {remaining} 步！您必须立即完成任务或调用 done。',

		toolNotFound: '未找到工具 {toolName}',
		pageInstructionsError: '[PageAgent] 执行 getPageInstructions 回调失败：',
	},
}

/**
 * Get translation for the specified language
 */
export function getTranslations(language: Language): Translations {
	return translations[language] || translations.en
}

/**
 * Create a translation function for the specified language
 */
export function createTranslator(language: Language) {
	const t = translations[language] || translations.en

	return function translate(
		key: keyof Translations,
		params?: Record<string, string | number>
	): string {
		let text = t[key] || key
		if (params) {
			for (const [param, value] of Object.entries(params)) {
				text = text.replace(`{${param}}`, String(value))
			}
		}
		return text
	}
}
