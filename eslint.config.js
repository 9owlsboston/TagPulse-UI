import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        RequestInit: 'readonly',
        URLSearchParams: 'readonly',
        EventSource: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        React: 'readonly',
        Element: 'readonly',
        CSSStyleDeclaration: 'readonly',
        HTMLElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLDivElement: 'readonly',
        getComputedStyle: 'readonly',
        // Browser storage / timers / encoding
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        performance: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        crypto: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        BlobCallback: 'readonly',
        SVGSVGElement: 'readonly',
        XMLSerializer: 'readonly',
        Image: 'readonly',
        MouseEvent: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      // Deep default imports like `@ant-design/icons/DownloadOutlined` resolve
      // to a CJS interop *wrapper object* in production builds (not the icon
      // component), crashing the page with React error #130. Always import
      // icons by name from the package root.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@ant-design/icons/*'],
              message:
                "Import icons by name from '@ant-design/icons' (e.g. import { DownloadOutlined } from '@ant-design/icons'). Deep imports crash prod builds (React #130).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'src/api/generated/'],
  },
];
