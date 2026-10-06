import { tokenizeMath } from '@site/src/components/math/formula'
import type { ReactNode } from 'react'

interface MathTextProps {
  /** Formula in the subset of TeX that `tokenizeMath` reads. */
  formula: string
}

/** Renders a formula in HTML with the same styling the chart gives its SVG labels. */
export default function MathText({ formula }: MathTextProps): ReactNode {
  return (
    <span className="math-text">
      {tokenizeMath(formula).map((token, index) => {
        const run = token.italic ? <i>{token.text}</i> : token.text

        // The tokens of a formula never change order, so the index is a stable key.
        return token.subscript ? <sub key={index}>{run}</sub> : <span key={index}>{run}</span>
      })}
    </span>
  )
}
