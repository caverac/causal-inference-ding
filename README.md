# A First Course in Causal Inference - Solutions

Solutions to the homework problems in Peng Ding's _"A First Course in Causal Inference"_ (Chapman and
Hall/CRC, 2024).

<p align="center">
  <a href="https://caverac.github.io/causal-inference-ding">
    <img src="https://img.shields.io/badge/View_Solutions-Online-4a5568?style=for-the-badge" alt="View Solutions Online">
  </a>
</p>

---

> **Note**: This repository contains **solutions only**. You will need a copy of the textbook to follow along
> with the problems.

---

## Table of Contents

- [About](#about)
- [Structure](#structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Quality Gates](#quality-gates)
- [Contributing](#contributing)
- [References](#references)
- [License](#license)

## About

Worked solutions to the homework problems that close every chapter and appendix of Ding's textbook. Proofs are
written out in full. Numerical problems are solved in R, in the `causalding` package, some sketches are drawn
with D3.js on a Docusaurus site.

**What this project is:**

- A study companion for working through Ding (2024)
- Solutions with explanations, tested R code and interactive figures
- An open-source resource for students of causal inference

**What this project is not:**

- A replacement for the textbook
- A verbatim reproduction of the book's problem statements

## Structure

The solutions follow the book's seven parts, with one page per chapter or appendix.

| Part | Title                                                | Units             |
| ---- | ---------------------------------------------------- | ----------------- |
| I    | Introduction                                         | Chapters 1-2      |
| II   | Randomized experiments                               | Chapters 3-9      |
| III  | Observational studies                                | Chapters 10-15    |
| IV   | Difficulties and challenges of observational studies | Chapters 16-20    |
| V    | Instrumental variables                               | Chapters 21-25    |
| VI   | Causal Mechanisms with Post-Treatment Variables      | Chapters 26-29    |
| VII  | Appendices                                           | Appendices A to C |

### Layout

```
.mise.toml                     toolchain: Node, R and air, all pinned
renv.lock                      R packages, restored into the project-local renv/ library
packages/causalding/           R package
  R/                           estimators and the data behind the figures
  tests/testthat/              tests, held to 100% line coverage
  scripts/                     one script per quality gate, run from the repository root
packages/docs/                 Docusaurus site
  docs/parts/partN/            one MDX page per chapter or appendix, plus a part index
  src/data/book.ts             part and unit structure of the book
  src/data/generated/          JSON written by the R package, imported by the figures
  src/components/              D3 figures and page helpers
  src/plugins/problemCounts.ts counts the solved problems on each page, for the progress chart
```

### From R to the page

Every number drawn on the site is computed in R. A function in `packages/causalding/R/` returns the data a
figure needs, the registry in `R/docs-data.R` names it, and `yarn r:export` writes it to
`packages/docs/src/data/generated/<name>.json`. A component under `packages/docs/src/components/` imports that
file, so `tsc` types the data from the JSON itself, and the component is used from MDX. CI regenerates the
JSON and fails when it differs from the committed copy.

## Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/), which provides every other tool at the version pinned in `.mise.toml`: Node,
  R (the conda-forge build) and [air](https://posit-dev.github.io/air/), the R formatter
- Yarn comes from Corepack, at the version pinned in `package.json`

Nothing is installed globally. R packages go into the project library under `renv/`, and JavaScript packages
into `node_modules/`.

### Installation

```bash
# Toolchain
mise install

# JavaScript dependencies; this also installs the Git hooks
corepack enable
yarn install

# R packages. The conda-forge build of R installs packages from source, so the
# first restore compiles them and takes a few minutes.
Rscript -e 'renv::restore()'
```

R must be started from the repository root, where `.Rprofile` activates renv and `.Renviron` puts the
compilers of the conda-forge build on `PATH`.

## Development

| Command           | What it does                                                 |
| ----------------- | ------------------------------------------------------------ |
| `yarn docs:start` | Serves the site locally, reloading on change                 |
| `yarn docs:build` | Builds the site for production                               |
| `yarn lint`       | ESLint on the TypeScript, with the strict type-checked rules |
| `yarn format`     | Prettier check (`yarn format:fix` to rewrite)                |
| `yarn typecheck`  | `tsc` on the docs workspace                                  |
| `yarn test`       | Vitest on the math behind the interactive figures            |
| `yarn r:format`   | Formats the R code with air (`yarn r:format:check` to check) |
| `yarn r:lint`     | lintr with every linter it ships                             |
| `yarn r:check`    | `R CMD check --as-cran`, failing on any NOTE                 |
| `yarn r:test`     | The testthat suite, failing on any warning                   |
| `yarn r:coverage` | Line coverage with covr, failing below 100%                  |
| `yarn r:document` | Regenerates `NAMESPACE` and `man/` from the roxygen comments |
| `yarn r:export`   | Regenerates the JSON drawn by the site                       |

## Quality Gates

CI (`.github/workflows/quality.yml`) runs every gate on each pull request and on `main`. The pre-commit hook
formats and lints the staged files, and type-checks the docs when TypeScript changes.

**R**

- **Format**: air, checked against the committed files.
- **Lint**: all 117 linters of lintr 3.4.0, the only setting being a line length of 100.
- **Types**: R has no production-ready static type checker, so types are held in place three ways:
  - `R CMD check --as-cran` treating a NOTE as a failure (enforced in CI), which catches undefined globals and
    functions, undeclared dependencies and code that disagrees with its documentation;
  - runtime contracts with [checkmate](https://mllg.github.io/checkmate/) on the arguments of every exported
    function, with tests asserting that bad input is rejected (convention);
  - roxygen documentation that states the type of every argument and return value, as in ``(`numeric(1)`)``
    (convention).
- **Tests**: testthat, failing on any warning, with 100% line coverage enforced by covr.
- **Generated files**: `NAMESPACE`, `man/` and the JSON drawn by the site must match what the code produces.

**TypeScript**

- **Lint**: ESLint with typescript-eslint's `strictTypeChecked` and `stylisticTypeChecked` presets, and no
  relative imports.
- **Types**: `tsc` with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **Tests**: Vitest on the geometry and arithmetic an interactive figure computes in the browser.
- **Format**: Prettier.
- **Build**: the Docusaurus build, which fails on broken links and anchors.

## Contributing

Contributions are welcome. If you find an error in a solution or want to add a missing one:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/chapter-1-problems`)
3. Write the solution on the page of its chapter, under `packages/docs/docs/parts/`
4. Put any computation in the R package, with tests, and export what the page draws
5. Make sure every gate above passes, then open a pull request

A solution opens with a level-two heading carrying the book's number for the problem. The progress chart
counts these headings, so the `## Problem` prefix matters. Problem statements are not reproduced.

```markdown
## Problem 1.2: More examples of the Yule-Simpson Paradox

The argument, closing with $\blacksquare$.
```

Please use [conventional commits](https://www.conventionalcommits.org/) for commit messages:

- `feat(chapter01): add a solution to problem 1.2`
- `fix(causalding): reject empty strata in the risk difference`
- `docs: update the README`

## References

- Ding, P. (2024). _A First Course in Causal Inference_. Chapman and Hall/CRC, Boca Raton.
  - ISBN: 9781032758626
  - DOI: [10.1201/9781003484080](https://doi.org/10.1201/9781003484080)
  - Preprint: [arXiv:2305.18793](https://arxiv.org/abs/2305.18793)
- Ding, P. (2023). _Replication Data for: A First Course in Causal Inference_. Harvard Dataverse, version 4.0.
  - DOI: [10.7910/DVN/ZX3VEV](https://doi.org/10.7910/DVN/ZX3VEV)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with <a href="https://www.r-project.org/">R</a>, <a href="https://docusaurus.io/">Docusaurus</a> and <a href="https://d3js.org/">D3.js</a></sub>
</p>
