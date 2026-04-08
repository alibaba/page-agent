import eslintReact from '@eslint-react/eslint-plugin'
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
	globalIgnores([
		'**/dist',
		'**/node_modules',
		'packages/*/src/components/ui',
		'**/.wxt',
		'**/.output',
	]),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.strictTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
			eslintReact.configs['recommended-typescript'],
		],
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-dynamic-delete': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/prefer-optional-chain': 'off',
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
			'@typescript-eslint/no-unnecessary-type-parameters': 'off',
			'@typescript-eslint/require-await': 'off',
			'@eslint-react/dom-no-missing-button-type': 'off',
			'@eslint-react/no-nested-component-definitions': 'off',
			'@eslint-react/no-array-index-key': 'off',
			'@eslint-react/dom-no-dangerously-set-innerhtml': 'off',
		},
	},
])
