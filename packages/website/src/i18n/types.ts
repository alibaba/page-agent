import 'react-i18next'

import type commonZh from './locales/zh-CN/common'
import type docsZh from './locales/zh-CN/docs'
import type homeZh from './locales/zh-CN/home'

declare module 'react-i18next' {
	interface CustomTypeOptions {
		defaultNS: 'common'
		resources: {
			common: typeof commonZh
			home: typeof homeZh
			docs: typeof docsZh
		}
	}
}
