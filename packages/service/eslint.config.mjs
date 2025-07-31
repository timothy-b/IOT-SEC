import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { importX } from 'eslint-plugin-import-x';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { process } from 'node:process';

export default defineConfig([
	{
		extends: [
			js.configs.recommended,
			importX.flatConfigs.recommended,
			importX.flatConfigs.typescript,
			tseslint.configs.strictTypeChecked,
		],
		plugins: {
			'@typescript-eslint': typescriptEslint,
		},
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.ts', '*.mjs', '*.test.ts', '*.d.ts'],
				},
				tsConfigRootDir: process.cwd(),
			},
		},
		files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
		rules: {
			quotes: [
				'error',
				'single',
				{
					avoidEscape: true,
				},
			],
			'jsx-quotes': ['error', 'prefer-double'],
			'comma-dangle': ['warn', 'always-multiline'],
			'ordered-imports': 'off',
			indent: [
				'error',
				'tab',
				{
					SwitchCase: 1,
				},
			],
			'arrow-parens': ['off'],
			'object-literal-sort-keys': 'off',
			curly: ['error', 'all'],
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowBoolean: true,
					allowNumber: true,
				},
			],
			'no-prototype-builtins': 'warn',
		},
	},
]);
