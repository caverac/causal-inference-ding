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

  it('sets Greek commands as symbols, lowercase in italic and capitals upright', () => {
    expect(tokenizeMath('\\Delta\\beta = \\rho_{ZX}')).toEqual([
      upright('\u0394'),
      italic('\u03b2'),
      upright(' = '),
      italic('\u03c1'),
      italic('Z', true),
      italic('X', true)
    ])
  })

  it('sets the arrow command upright', () => {
    expect(tokenizeMath('a \\to b')).toEqual([
      italic('a'),
      upright(' '),
      upright('\u2192'),
      upright(' '),
      italic('b')
    ])
  })

  it('keeps an unknown command as written', () => {
    expect(tokenizeMath('\\foo')).toEqual([upright('\\foo')])
  })

  it('splits a run of capitals into variables, and keeps words whole', () => {
    expect(tokenizeMath('\\rho_{YX|Z} pr')).toEqual([
      italic('\u03c1'),
      italic('Y', true),
      italic('X', true),
      upright('|', true),
      italic('Z', true),
      upright(' '),
      upright('pr')
    ])
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
