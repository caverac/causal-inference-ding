import { tokenizeMath, type MathToken } from '@site/src/components/math/formula'
import { describe, expect, it } from 'vitest'

const upright = (text: string, subscript = false): MathToken => ({
  text,
  italic: false,
  subscript
})
const italic = (text: string, subscript = false): MathToken => ({ text, italic: true, subscript })

describe('tokenizeMath', () => {
  it('sets single-letter variables in italic and words upright', () => {
    expect(tokenizeMath('pr(Y = 1 | Z = 0) = 0.304')).toEqual([
      upright('pr'),
      upright('('),
      italic('Y'),
      upright(' = 1 | '),
      italic('Z'),
      upright(' = 0) = 0.304')
    ])
  })

  it('lowers subscripts and styles their content the same way', () => {
    expect(tokenizeMath('n_{z0}')).toEqual([italic('n'), italic('z', true), upright('0', true)])
  })

  it('keeps the content of \\mathrm upright', () => {
    expect(tokenizeMath('D = \\mathrm{A}')).toEqual([italic('D'), upright(' = '), upright('A')])
  })

  it('keeps every character of a formula without markup', () => {
    const formula = 'pr(Y = 1 | Z = 1, D) = 512/825 = \u22120.203'

    expect(
      tokenizeMath(formula)
        .map(token => token.text)
        .join('')
    ).toBe(formula)
  })
})
