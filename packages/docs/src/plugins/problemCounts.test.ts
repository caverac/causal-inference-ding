import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { parts, unitDocId } from '@site/src/data/book'
import { countProblems, readProblemCounts } from '@site/src/plugins/problemCounts'
import { afterEach, describe, expect, it } from 'vitest'

describe('countProblems', () => {
  it('counts level-two headings that open a problem', () => {
    expect(countProblems('## Problem 1.1: A\n\nText.\n\n## Problem 1.2: B\n')).toBe(2)
  })

  it('ignores other headings and mentions of a problem in the text', () => {
    expect(countProblems('### Problem 1.1\n\nAs in Problem 1.2.\n\n## Problems\n')).toBe(0)
  })

  it('ignores headings inside MDX comments', () => {
    expect(countProblems('{/*\n## Problem 1.3: draft\n*/}\n\n## Problem 1.4: done\n')).toBe(1)
  })
})

describe('readProblemCounts', () => {
  const temporary: string[] = []

  afterEach(() => {
    for (const dir of temporary.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('keys the count of each page by its document id', () => {
    const docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'problem-counts-'))
    temporary.push(docsDir)
    fs.mkdirSync(path.join(docsDir, 'parts', 'part1'), { recursive: true })
    fs.writeFileSync(path.join(docsDir, 'parts', 'part1', 'chapter01.mdx'), '## Problem 1.1: A\n')
    fs.writeFileSync(path.join(docsDir, 'parts', 'part1', 'index.mdx'), '# Part I\n')

    expect(readProblemCounts(docsDir)).toEqual({
      'parts/part1/chapter01': 1,
      'parts/part1/index': 0
    })
  })

  it('finds a page for every chapter and appendix of the book', () => {
    const counts = readProblemCounts(path.join(import.meta.dirname, '..', '..', 'docs'))

    for (const part of parts) {
      for (const unit of part.units) {
        expect(counts).toHaveProperty([unitDocId(part, unit)])
      }
    }
  })
})
