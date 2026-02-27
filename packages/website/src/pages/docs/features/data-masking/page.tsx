import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function DataMasking() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? '数据脱敏' : 'Data Masking'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? '使用 transformPageContent 钩子在页面内容发送给 LLM 之前进行处理，可用于检查清洗效果、修改页面信息、隐藏敏感数据等。'
					: 'Use the transformPageContent hook to process page content before sending to LLM. Useful for inspecting extraction results, modifying page info, and masking sensitive data.'}
			</p>

			<section className="mb-12">
				<Heading id="api-definition" className="text-3xl font-bold mb-6">
					{isZh ? '接口定义' : 'API Definition'}
				</Heading>

				<CodeEditor
					className="mb-6"
					code={`interface PageAgentConfig {
  /**
   * Transform page content before sending to LLM.
   * Called after DOM extraction and simplification.
   */
  transformPageContent?: (content: string) => Promise<string> | string
}`}
				/>
			</section>

			<section className="mb-12">
				<Heading id="common-masking-patterns" className="text-3xl font-bold mb-6">
					{isZh ? '常用脱敏规则' : 'Common Masking Patterns'}
				</Heading>

				<p className="text-gray-600 dark:text-gray-300 mb-6">
					{isZh
						? '以下示例展示了如何脱敏常见的敏感信息：'
						: 'The following example shows how to mask common sensitive data:'}
				</p>

				<CodeEditor
					code={`const agent = new PageAgent({
  transformPageContent: async (content) => {
    // China phone number (11 digits starting with 1)
    content = content.replace(/\\b(1[3-9]\\d)(\\d{4})(\\d{4})\\b/g, '$1****$3')

    // Email address
    content = content.replace(
      /\\b([a-zA-Z0-9._%+-])[^@]*(@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})\\b/g,
      '$1***$2'
    )

    // China ID card number (18 digits)
    content = content.replace(
      /\\b(\\d{6})(19|20\\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])(\\d{3}[\\dXx])\\b/g,
      '$1********$5'
    )

    // Bank card number (16-19 digits)
    content = content.replace(/\\b(\\d{4})\\d{8,11}(\\d{4})\\b/g, '$1********$2')

    return content
  }
})`}
				/>
			</section>
		</div>
	)
}
