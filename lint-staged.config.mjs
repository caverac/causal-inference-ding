const DOCS_WORKSPACE = '@causal-inference-ding/docs'

/**
 * Quotes staged paths for the shell, since lint-staged hands a function the
 * bare list and the command it returns is parsed as a single string.
 */
const quote = files => files.map(file => `"${file}"`).join(' ')

export default {
  // Lint, format and type-check TypeScript. The type check covers the whole
  // docs workspace, because a change in one module can break its importers.
  '*.{ts,tsx,mts}': ['eslint --max-warnings 0 --fix', 'prettier --write', () => 'yarn typecheck'],

  '*.{js,mjs,cjs}': ['eslint --max-warnings 0 --fix', 'prettier --write'],

  '*.{json,md,yml,yaml,css}': ['prettier --write'],

  // Format MDX, then compile it. Prettier parses MDX loosely and accepts
  // constructs the site cannot build, an HTML comment being the common one, so
  // the compiler pass is what actually rejects invalid syntax.
  '*.mdx': [
    'prettier --write',
    files => `yarn workspace ${DOCS_WORKSPACE} check-mdx ${quote(files)}`
  ],

  // Format R with air, then lint the whole package: the object usage linter
  // needs the package namespace, which a single file does not provide.
  '*.R': ['air format', () => 'yarn r:lint']
}
