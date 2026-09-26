import * as fs from 'fs'
import * as path from 'path'

import type { LoadContext, Plugin } from '@docusaurus/types'

import { PROBLEM_COUNTS_PLUGIN, type ProblemCounts } from '#data/problemCounts'

/** MDX comments, `{/* ... *\/}`, which may hold drafts of a solution. */
const MDX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g

/** A solved problem opens with a level-two heading such as `## Problem 1.2`. */
const PROBLEM_HEADING = /^##\s+Problem\b/gm

/** Counts the solved problems in the source of one solution page. */
export function countProblems(source: string): number {
  return source.replace(MDX_COMMENT, '').match(PROBLEM_HEADING)?.length ?? 0
}

/**
 * Counts the solved problems on every page under `docs/parts`, keyed by the
 * document id of the page.
 */
export function readProblemCounts(docsDir: string): ProblemCounts {
  const partsDir = path.join(docsDir, 'parts')
  const pages = fs
    .readdirSync(partsDir, { recursive: true, encoding: 'utf-8' })
    .filter(file => file.endsWith('.mdx'))

  return Object.fromEntries(
    pages.map(file => [
      path.posix.join('parts', file.split(path.sep).join('/')).replace(/\.mdx$/, ''),
      countProblems(fs.readFileSync(path.join(partsDir, file), 'utf-8'))
    ])
  )
}

/**
 * Publishes the number of solved problems on each solution page as global
 * plugin data, so the progress figures are computed from the pages themselves
 * on every build and every reload of the development server.
 */
export default function problemCountsPlugin(context: LoadContext): Plugin<ProblemCounts> {
  const docsDir = path.join(context.siteDir, 'docs')

  return {
    name: PROBLEM_COUNTS_PLUGIN,
    loadContent: () => readProblemCounts(docsDir),
    contentLoaded: ({ content, actions }) => {
      actions.setGlobalData(content)
    },
    getPathsToWatch: () => [path.join(docsDir, 'parts', '**', '*.mdx')]
  }
}
