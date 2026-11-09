// SPDX-License-Identifier: GPL-3.0-or-later
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SPDX = 'SPDX-License-Identifier: GPL-3.0-or-later';

/** Local rule: every source file must start with the project's SPDX license header. */
const spdxHeaderRule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    messages: { missing: `First line must be the comment "// ${SPDX}".` },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const first = context.sourceCode.getAllComments()[0];
        const ok = first && first.range[0] === 0 && first.value.trim() === SPDX;
        if (!ok) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            messageId: 'missing',
            fix: (fixer) => fixer.insertTextBeforeRange([0, 0], `// ${SPDX}\n`),
          });
        }
      },
    };
  },
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'notes', 'temp'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { local: { rules: { 'spdx-header': spdxHeaderRule } } },
    rules: {
      'local/spdx-header': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // The pure layers must never reach into the UI, state/storage, or the DOM.
    files: ['src/core/**', 'src/catalog/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/ui/**', '**/state/**', 'preact', 'preact/*'] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage'],
    },
  },
  prettier,
);
