/**
 * Lightweight i18n for recording UI components.
 *
 * Follows the project pattern: language is configured via useAgent().config.language
 * and only supports 'en-US' | 'zh-CN' | undefined (system default).
 */

type Locale = 'en-US' | 'zh-CN'

const translations: Record<string, Record<Locale, string>> = {
	// RecordingIndicator
	'recording.status': { 'en-US': 'Recording...', 'zh-CN': '录制中...' },
	'recording.steps': { 'en-US': 'steps', 'zh-CN': '步' },
	'recording.stop': { 'en-US': 'Stop', 'zh-CN': '停止' },
	'recording.discard': { 'en-US': 'Discard', 'zh-CN': '丢弃' },

	// RecordingList
	'recordings.title': { 'en-US': 'Recordings', 'zh-CN': '录制列表' },
	'recordings.clearAll': { 'en-US': 'Clear All', 'zh-CN': '全部清除' },
	'recordings.loading': { 'en-US': 'Loading...', 'zh-CN': '加载中...' },
	'recordings.empty': { 'en-US': 'No recordings yet', 'zh-CN': '暂无录制' },
	'recordings.unnamed': { 'en-US': 'Unnamed Recording', 'zh-CN': '未命名录制' },
	'recordings.replay': { 'en-US': 'Replay', 'zh-CN': '回放' },
	'recordings.delete': { 'en-US': 'Delete', 'zh-CN': '删除' },

	// RecordingDetail
	'detail.title': { 'en-US': 'Recording Detail', 'zh-CN': '录制详情' },
	'detail.exportJson': { 'en-US': 'Export JSON', 'zh-CN': '导出 JSON' },
	'detail.copied': { 'en-US': 'Copied!', 'zh-CN': '已复制!' },
	'detail.namePlaceholder': { 'en-US': 'Recording name...', 'zh-CN': '录制名称...' },
	'detail.descPlaceholder': { 'en-US': 'Description...', 'zh-CN': '描述...' },
	'detail.save': { 'en-US': 'Save', 'zh-CN': '保存' },
	'detail.parameters': { 'en-US': 'Parameters', 'zh-CN': '参数' },
	'detail.modification': { 'en-US': 'Modification (optional)', 'zh-CN': '自然语言修改（可选）' },
	'detail.modPlaceholder': {
		'en-US': "e.g., 'Search for React tutorial instead' or 'Skip the last step'",
		'zh-CN': "例如：'搜索 React 教程' 或 '跳过最后一步'",
	},
	'detail.steps': { 'en-US': 'Steps', 'zh-CN': '步骤' },
	'detail.replayBtn': { 'en-US': 'Replay Recording', 'zh-CN': '回放录制' },

	// RecordingStepCard action labels
	'step.click': { 'en-US': 'Click', 'zh-CN': '点击' },
	'step.type': { 'en-US': 'Type', 'zh-CN': '输入' },
	'step.select': { 'en-US': 'Select', 'zh-CN': '选择' },
	'step.scroll': { 'en-US': 'Scroll', 'zh-CN': '滚动' },
	'step.navigate': { 'en-US': 'Navigate to', 'zh-CN': '导航到' },
	'step.newTab': { 'en-US': 'New tab:', 'zh-CN': '新标签页:' },
	'step.switchTab': { 'en-US': 'Switch to tab', 'zh-CN': '切换到标签页' },
	'step.closeTab': { 'en-US': 'Close tab', 'zh-CN': '关闭标签页' },
	'step.press': { 'en-US': 'Press', 'zh-CN': '按键' },
	'step.wait': { 'en-US': 'Wait', 'zh-CN': '等待' },
	'step.in': { 'en-US': 'in', 'zh-CN': '在' },

	// ParamEditor
	'params.title': { 'en-US': 'Parameters', 'zh-CN': '参数' },

	// App header tooltips
	'header.startRecording': { 'en-US': 'Start recording', 'zh-CN': '开始录制' },
	'header.stopRecording': { 'en-US': 'Stop recording', 'zh-CN': '停止录制' },
	'header.recordings': { 'en-US': 'Recordings', 'zh-CN': '录制列表' },

	// Time ago
	'time.justNow': { 'en-US': 'just now', 'zh-CN': '刚刚' },
	'time.mAgo': { 'en-US': 'm ago', 'zh-CN': '分钟前' },
	'time.hAgo': { 'en-US': 'h ago', 'zh-CN': '小时前' },
	'time.dAgo': { 'en-US': 'd ago', 'zh-CN': '天前' },

	// Error
	'error.loadFailed': { 'en-US': 'Failed to load', 'zh-CN': '加载失败' },
	'error.saveFailed': { 'en-US': 'Failed to save', 'zh-CN': '保存失败' },
	'error.recordingFailed': { 'en-US': 'Recording failed', 'zh-CN': '录制失败' },
}

/** Detect locale from browser settings */
function detectLocale(): Locale {
	const lang = navigator.language || 'en-US'
	return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

let currentLocale: Locale = detectLocale()

/** Set the locale. Call this when config.language changes. */
export function setLocale(lang?: string) {
	if (lang === 'zh-CN') {
		currentLocale = 'zh-CN'
	} else if (lang === 'en-US') {
		currentLocale = 'en-US'
	} else {
		currentLocale = detectLocale()
	}
}

/** Get the current locale */
export function getLocale(): Locale {
	return currentLocale
}

/** Translate a key. Falls back to en-US if key not found. */
export function t(key: string): string {
	const entry = translations[key]
	if (!entry) return key
	return entry[currentLocale] || entry['en-US'] || key
}

/** Localized "time ago" helper */
export function timeAgoLocalized(ts: number): string {
	const seconds = Math.floor((Date.now() - ts) / 1000)
	if (seconds < 60) return t('time.justNow')
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}${t('time.mAgo')}`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}${t('time.hAgo')}`
	const days = Math.floor(hours / 24)
	return `${days}${t('time.dAgo')}`
}
