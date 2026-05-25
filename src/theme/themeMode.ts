/**
 * Standalone `ThemeMode` type. Lives apart from `ThemeProvider.tsx`
 * so the token catalog (`tokens.ts`) can reference it without
 * importing the provider — a cycle that would yank React + AntD into
 * the catalog's import graph.
 */
export type ThemeMode = 'light' | 'dark';
