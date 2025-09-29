import type { TranslationSchema } from './types'

// 中文翻译（作为基准）
const zhCN: TranslationSchema = {
	ui: {
		panel: {
			ready: '准备就绪',
			thinking: '正在思考...',
			paused: '暂停中，稍后',
			taskInput: '输入新任务，详细描述步骤，回车提交',
			userAnswerPrompt: '请回答上面问题，回车提交',
			taskTerminated: '任务已终止',
			taskCompleted: '任务结束',
			continueExecution: '继续执行',
			userAnswer: '用户回答: {{input}}',
			pause: '暂停',
			continue: '继续',
			stop: '终止',
			expand: '展开历史',
			collapse: '收起历史',
			step: '步骤 {{number}} · {{time}}{{duration}}',
		},
		tools: {
			clicking: '正在点击元素 [{{index}}]...',
			inputting: '正在输入文本到元素 [{{index}}]...',
			selecting: '正在选择选项 "{{text}}"...',
			scrolling: '正在滚动页面...',
			waiting: '等待 {{seconds}} 秒...',
			done: '结束任务',
			clicked: '🖱️ 已点击元素 [{{index}}]',
			inputted: '⌨️ 已输入文本 "{{text}}"',
			selected: '☑️ 已选择选项 "{{text}}"',
			scrolled: '🛞 页面滚动完成',
			waited: '⌛️ 等待完成',
			executing: '正在执行 {{toolName}}...',
		},
		errors: {
			elementNotFound: '未找到索引为 {{index}} 的交互元素',
			taskRequired: '任务描述不能为空',
			executionFailed: '任务执行失败',
			notInputElement: '元素不是输入框或文本域',
			notSelectElement: '元素不是选择框',
			optionNotFound: '未找到选项 "{{text}}"',
		},
	},
} as const

// 英文翻译（必须符合相同的结构）
const enUS: TranslationSchema = {
	ui: {
		panel: {
			ready: 'Ready',
			thinking: 'Thinking...',
			paused: 'Paused',
			taskInput: 'Enter new task, describe steps in detail, press Enter to submit',
			userAnswerPrompt: 'Please answer the question above, press Enter to submit',
			taskTerminated: 'Task terminated',
			taskCompleted: 'Task completed',
			continueExecution: 'Continue execution',
			userAnswer: 'User answer: {{input}}',
			pause: 'Pause',
			continue: 'Continue',
			stop: 'Stop',
			expand: 'Expand history',
			collapse: 'Collapse history',
			step: 'Step {{number}} · {{time}}{{duration}}',
		},
		tools: {
			clicking: 'Clicking element [{{index}}]...',
			inputting: 'Inputting text to element [{{index}}]...',
			selecting: 'Selecting option "{{text}}"...',
			scrolling: 'Scrolling page...',
			waiting: 'Waiting {{seconds}} seconds...',
			done: 'Task done',
			clicked: '🖱️ Clicked element [{{index}}]',
			inputted: '⌨️ Inputted text "{{text}}"',
			selected: '☑️ Selected option "{{text}}"',
			scrolled: '🛞 Page scrolled',
			waited: '⌛️ Wait completed',
			executing: '正在执行 {{toolName}}...',
		},
		errors: {
			elementNotFound: 'No interactive element found at index {{index}}',
			taskRequired: 'Task description is required',
			executionFailed: 'Task execution failed',
			notInputElement: 'Element is not an input or textarea',
			notSelectElement: 'Element is not a select element',
			optionNotFound: 'Option "{{text}}" not found',
		},
	},
} as const

export const locales = {
	'zh-CN': zhCN,
	'en-US': enUS,
} as const

export type SupportedLanguage = keyof typeof locales
