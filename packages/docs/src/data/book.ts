export type UnitKind = 'chapter' | 'appendix'

export interface Unit {
  /** Whether the unit is a numbered chapter or a lettered appendix. */
  readonly kind: UnitKind
  /** Chapter number ('1') or appendix letter ('A'), as printed in the book. */
  readonly label: string
  /** Title as printed in the book, in plain ASCII text. */
  readonly title: string
  /** File name of the solution page within the part folder, without extension. */
  readonly slug: string
}

export interface Part {
  readonly id: number
  /** Roman numeral as printed in the book. */
  readonly numeral: string
  /** Title as printed in the book, used as the page heading of the part index. */
  readonly title: string
  /** Abbreviated title, used for the sidebar category label. */
  readonly shortTitle: string
  readonly units: readonly Unit[]
}

function chapter(number: number, title: string): Unit {
  return {
    kind: 'chapter',
    label: String(number),
    title,
    slug: `chapter${String(number).padStart(2, '0')}`
  }
}

function appendix(letter: string, title: string): Unit {
  return { kind: 'appendix', label: letter, title, slug: `appendix-${letter.toLowerCase()}` }
}

/**
 * Structure of Peng Ding, "A First Course in Causal Inference" (Chapman and
 * Hall/CRC, 2024), as listed in its table of contents. Every chapter and
 * appendix ends with its own homework problems, so each has one solution page.
 *
 * The part indexes and the progress figures are derived from this table, and it
 * mirrors the pages under `docs/parts`.
 */
export const parts: readonly Part[] = [
  {
    id: 1,
    numeral: 'I',
    title: 'Introduction',
    shortTitle: 'Part I: Introduction',
    units: [
      chapter(1, 'Correlation, Association, and the Yule-Simpson Paradox'),
      chapter(2, 'Potential Outcomes')
    ]
  },
  {
    id: 2,
    numeral: 'II',
    title: 'Randomized experiments',
    shortTitle: 'Part II: Randomized Experiments',
    units: [
      chapter(3, 'The Completely Randomized Experiment and the Fisher Randomization Test'),
      chapter(4, 'Neymanian Repeated Sampling Inference in Completely Randomized Experiments'),
      chapter(5, 'Stratification and Post-Stratification in Randomized Experiments'),
      chapter(6, 'Rerandomization and Regression Adjustment'),
      chapter(7, 'Matched-Pairs Experiment'),
      chapter(8, 'Unification of the Fisherian and Neymanian Inferences in Randomized Experiments'),
      chapter(9, 'Bridging Finite and Super Population Causal Inference')
    ]
  },
  {
    id: 3,
    numeral: 'III',
    title: 'Observational studies',
    shortTitle: 'Part III: Observational Studies',
    units: [
      chapter(
        10,
        'Observational Studies, Selection Bias, and Nonparametric Identification of Causal Effects'
      ),
      chapter(
        11,
        'The Central Role of the Propensity Score in Observational Studies for Causal Effects'
      ),
      chapter(
        12,
        'The Doubly Robust or the Augmented Inverse Propensity Score Weighting Estimator for the Average Causal Effect'
      ),
      chapter(13, 'The Average Causal Effect on the Treated Units and Other Estimands'),
      chapter(14, 'Using the Propensity Score in Regressions for Causal Effects'),
      chapter(15, 'Matching in Observational Studies')
    ]
  },
  {
    id: 4,
    numeral: 'IV',
    title: 'Difficulties and challenges of observational studies',
    shortTitle: 'Part IV: Difficulties and Challenges',
    units: [
      chapter(16, 'Difficulties of Unconfoundedness in Observational Studies for Causal Effects'),
      chapter(
        17,
        'E-Value: Evidence for Causation in Observational Studies with Unmeasured Confounding'
      ),
      chapter(18, 'Sensitivity Analysis for the Average Causal Effect with Unmeasured Confounding'),
      chapter(
        19,
        'Rosenbaum-Style p-Values for Matched Observational Studies with Unmeasured Confounding'
      ),
      chapter(20, 'Overlap in Observational Studies: Difficulties and Opportunities')
    ]
  },
  {
    id: 5,
    numeral: 'V',
    title: 'Instrumental variables',
    shortTitle: 'Part V: Instrumental Variables',
    units: [
      chapter(21, 'An Experimental Perspective of the Instrumental Variable'),
      chapter(22, 'Disentangle Mixture Distributions and Instrumental Variable Inequalities'),
      chapter(23, 'An Econometric Perspective of the Instrumental Variable'),
      chapter(
        24,
        'Application of the Instrumental Variable Method: Fuzzy Regression Discontinuity'
      ),
      chapter(25, 'Application of the Instrumental Variable Method: Mendelian Randomization')
    ]
  },
  {
    id: 6,
    numeral: 'VI',
    title: 'Causal Mechanisms with Post-Treatment Variables',
    shortTitle: 'Part VI: Causal Mechanisms',
    units: [
      chapter(26, 'Principal Stratification'),
      chapter(27, 'Mediation Analysis: Natural Direct and Indirect Effects'),
      chapter(28, 'Controlled Direct Effect'),
      chapter(29, 'Time-Varying Treatment and Confounding')
    ]
  },
  {
    id: 7,
    numeral: 'VII',
    title: 'Appendices',
    shortTitle: 'Part VII: Appendices',
    units: [
      appendix('A', 'Probability and Statistics'),
      appendix('B', 'Linear and Logistic Regressions'),
      appendix('C', 'Some Useful Lemmas for Simple Random Sampling From a Finite Population')
    ]
  }
]

export const totalUnits = parts.reduce((total, part) => total + part.units.length, 0)

/** Prefix as printed in the book, for example 'Chapter 1' or 'Appendix A'. */
export function unitPrefix(unit: Unit): string {
  return unit.kind === 'chapter' ? `Chapter ${unit.label}` : `Appendix ${unit.label}`
}

/** Docusaurus document id of a solution page, for example 'parts/part1/chapter01'. */
export function unitDocId(part: Part, unit: Unit): string {
  return `parts/part${String(part.id)}/${unit.slug}`
}
