import * as fs from 'fs'
import * as path from 'path'

import { compile } from '@mdx-js/mdx'
import remarkMath from 'remark-math'

/**
 * Validates MDX sources by compiling them with the same compiler Docusaurus
 * uses. This catches syntax errors that Prettier accepts silently, the most
 * common one being an HTML comment: in MDX a `<` always opens JSX, so
 * `<!-- ... -->` is a parse error and the comment form is `{/* ... *\/}`.
 *
 * `remark-math` is required here, not optional. Without it the `{` in a LaTeX
 * environment such as `\begin{aligned}` is read as the start of a JSX
 * expression and every display equation reports a spurious error.
 *
 * Usage: tsx scripts/check-mdx.ts <file.mdx> [...]
 */

interface Diagnostic {
  file: string
  line: number | null
  column: number | null
  reason: string
  ruleId: string | null
}

interface VFileMessageLike {
  reason: string
  line: number | null
  column: number | null
  ruleId: string | null
}

/**
 * Narrows a thrown value to the `VFileMessage` shape that the MDX compiler
 * raises for a syntax error, which carries the position of the offending node.
 */
function isVFileMessageLike(value: unknown): value is VFileMessageLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reason' in value &&
    typeof value.reason === 'string'
  )
}

/**
 * Compiles one file, returning a diagnostic when the compiler rejects it and
 * null when the file is valid MDX.
 */
async function checkFile(filePath: string): Promise<Diagnostic | null> {
  try {
    const source = fs.readFileSync(filePath, 'utf-8')
    await compile(source, { remarkPlugins: [remarkMath] })
    return null
  } catch (error: unknown) {
    if (isVFileMessageLike(error)) {
      return {
        file: filePath,
        line: error.line,
        column: error.column,
        reason: error.reason,
        ruleId: error.ruleId
      }
    }

    return {
      file: filePath,
      line: null,
      column: null,
      reason: error instanceof Error ? error.message : String(error),
      ruleId: null
    }
  }
}

/**
 * Formats a diagnostic as `path:line:column reason (rule)`, the layout editors
 * and terminals recognize as a jump target.
 */
function formatDiagnostic(diagnostic: Diagnostic): string {
  const location = diagnostic.line === null ? '' : `:${diagnostic.line}:${diagnostic.column ?? 1}`
  const rule = diagnostic.ruleId === null ? '' : ` (${diagnostic.ruleId})`

  return `${path.relative(process.cwd(), diagnostic.file)}${location} ${diagnostic.reason}${rule}`
}

async function main(): Promise<void> {
  const files = process.argv.slice(2).filter(file => file.endsWith('.mdx'))

  if (files.length === 0) {
    return
  }

  const results = await Promise.all(files.map(checkFile))
  const diagnostics = results.filter((result): result is Diagnostic => result !== null)

  for (const diagnostic of diagnostics) {
    // eslint-disable-next-line no-console
    console.error(formatDiagnostic(diagnostic))
  }

  if (diagnostics.length > 0) {
    process.exitCode = 1
  }
}

void main()
