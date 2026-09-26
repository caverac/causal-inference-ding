import type * as d3 from 'd3'

/** A run of a formula set in one style. */
export interface MathToken {
  readonly text: string
  /** Single-letter variables are italic; words such as `pr` and `rd`, digits and symbols are upright. */
  readonly italic: boolean
  readonly subscript: boolean
}

/**
 * `_{...}` opens a subscript, `\mathrm{...}` keeps its content upright, a run
 * of letters is a word or a variable, and anything else is set upright.
 */
const TOKEN =
  /_\{([^}]*)\}|\\mathrm\{([^}]*)\}|([A-Za-z]+)|([^A-Za-z]+?(?=[A-Za-z]|_\{|\\mathrm\{|$))/g

/**
 * Splits a formula written in a small subset of TeX into styled runs, so the
 * labels of a chart read like the formulas of the text around it while every
 * run keeps the one font size of the chart.
 */
export function tokenizeMath(formula: string, subscript = false): MathToken[] {
  const tokens: MathToken[] = []

  for (const [, lowered, upright, letters, other] of formula.matchAll(TOKEN)) {
    if (lowered !== undefined) {
      tokens.push(...tokenizeMath(lowered, true))
    } else if (upright !== undefined) {
      tokens.push({ text: upright, italic: false, subscript })
    } else if (letters !== undefined) {
      tokens.push({ text: letters, italic: letters.length === 1, subscript })
    } else {
      tokens.push({ text: other ?? '', italic: false, subscript })
    }
  }

  return tokens
}

/** Vertical offset of a subscript, in units of the font size. */
const SUBSCRIPT_SHIFT_EM = 0.3

/**
 * Appends a formula to an SVG text element as styled tspans. Subscripts are
 * lowered with `dy` rather than `baseline-shift`, which not every browser
 * supports, and keep the font size of the rest of the label.
 */
export function appendMathText<Datum, PElement extends d3.BaseType, PDatum>(
  text: d3.Selection<SVGTextElement, Datum, PElement, PDatum>,
  formula: string
): void {
  let lowered = false

  for (const token of tokenizeMath(formula)) {
    const span = text.append('tspan').text(token.text)
    if (token.italic) {
      span.attr('font-style', 'italic')
    }
    if (token.subscript !== lowered) {
      span.attr('dy', `${token.subscript ? SUBSCRIPT_SHIFT_EM : -SUBSCRIPT_SHIFT_EM}em`)
      lowered = token.subscript
    }
  }
}
