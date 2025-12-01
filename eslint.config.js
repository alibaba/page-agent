import js from '@eslint/js'
import reactDom from 'eslint-plugin-react-dom'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactX from 'eslint-plugin-react-x'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
	globalIgnores(['**/dist', '**/test-pages', '**/node_modules']),
	{
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: reactHooks.configs.recommended.rules,
	},
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			// reactHooks.configs['recommended-latest'],
			reactRefresh.configs.vite,

			// Remove tseslint.configs.recommended and replace with this
			...tseslint.configs.recommendedTypeChecked,
			// Alternatively, use this for stricter rules
			...tseslint.configs.strictTypeChecked,
			// Optionally, add this for stylistic rules
			...tseslint.configs.stylisticTypeChecked,

			// Enable lint rules for React
			reactX.configs['recommended-typescript'],
			// Enable lint rules for React DOM
			reactDom.configs.recommended,
		],
		languageOptions: {
			parserOptions: {
				project: ['./packages/*/tsconfig.json'],
				tsconfigRootDir: import.meta.dirname,
			},
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		rules: {
			// Add any additional rules here
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
			'react-dom/no-missing-button-type': 'off',
			'react-x/no-nested-component-definitions': 'off',
			'@typescript-eslint/prefer-optional-chain': 'off',
		},
	},
])
