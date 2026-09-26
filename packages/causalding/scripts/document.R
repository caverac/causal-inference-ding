# Regenerates `NAMESPACE` and the help pages under `man/` from the roxygen
# comments in `R/`. Both are committed, and CI fails when they are stale.
#
# Run from the repository root, where renv activates the project library:
#   Rscript packages/causalding/scripts/document.R

roxygen2::roxygenise(file.path("packages", "causalding"))
