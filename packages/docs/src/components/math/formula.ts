import type * as d3 from 'd3'

/** A run of a formula set in one style. */
export interface MathToken {
  readonly text: string
  /** Single-letter variables are italic; words such as `pr` and `rd`, digits and symbols are upright. */
  readonly italic: boolean
  readonly subscript: boolean
}

/**
 * `_{...}` opens a subscript, `\mathrm{...}` keeps its content upright, a
 * command such as `\rho` is a symbol, a run of letters is a word or a
 * variable, and anything else is set upright.
 */
const TOKEN =
  /_\{([^}]*)\}|\\mathrm\{([^}]*)\}|\\([A-Za-z]+)|([A-Za-z]+)|([^A-Za-z]+?(?=[A-Za-z]|_\{|\\[A-Za-z]|$))/g

/**
 * The commands a formula may use, by code point so that the source stays
 * ASCII. Lowercase Greek letters are variables, set in italic; capital Greek
 * letters and arrows are upright, as in the text.
 */
const SYMBOLS: Readonly<Record<string, { readonly codePoint: number; readonly italic: boolean }>> =
  {
    alpha: { codePoint: 0x3b1, italic: true },
    beta: { codePoint: 0x3b2, italic: true },
    gamma: { codePoint: 0x3b3, italic: true },
    delta: { codePoint: 0x3b4, italic: true },
    rho: { codePoint: 0x3c1, italic: true },
    sigma: { codePoint: 0x3c3, italic: true },
    tau: { codePoint: 0x3c4, italic: true },
    Delta: { codePoint: 0x394, italic: false },
    to: { codePoint: 0x2192, italic: false }
  }

function symbolToken(command: string, subscript: boolean): MathToken {
  const symbol = SYMBOLS[command]
  return symbol === undefined
    ? { text: `\\${command}`, italic: false, subscript }
    : { text: String.fromCodePoint(symbol.codePoint), italic: symbol.italic, subscript }
}

/**
 * A run of letters: a single letter is a variable, in italic; a run of
 * capitals such as `YX` is a product of variables, one italic letter each;
 * any other run is a word such as `pr` or `rd`, set upright.
 */
function letterTokens(letters: string, subscript: boolean): MathToken[] {
  if (letters.length > 1 && letters === letters.toUpperCase()) {
    // The run holds ASCII letters only, so every character is one letter.
    return Array.from({ length: letters.length }, (_unused, index) => ({
      text: letters.charAt(index),
      italic: true,
      subscript
    }))
  }
  return [{ text: letters, italic: letters.length === 1, subscript }]
}

/**
 * Splits a formula written in a small subset of TeX into styled runs, so the
 * labels of a chart read like the formulas of the text around it while every
 * run keeps the one font size of the chart.
 */
export function tokenizeMath(formula: string, subscript = false): MathToken[] {
  const tokens: MathToken[] = []

  for (const [, lowered, upright, command, letters, other] of formula.matchAll(TOKEN)) {
    if (lowered !== undefined) {
      tokens.push(...tokenizeMath(lowered, true))
    } else if (upright !== undefined) {
      tokens.push({ text: upright, italic: false, subscript })
    } else if (command !== undefined) {
      tokens.push(symbolToken(command, subscript))
    } else if (letters !== undefined) {
      tokens.push(...letterTokens(letters, subscript))
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
