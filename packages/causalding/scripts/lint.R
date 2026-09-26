# Lints the package and these development scripts with the rules in
# `packages/causalding/.lintr`, failing when any lint is found.
#
# Run from the repository root, where renv activates the project library:
#   Rscript packages/causalding/scripts/lint.R

package_dir <- file.path("packages", "causalding")

# The cyclomatic complexity linter needs the cyclocomp package. Requiring it by
# name also lets renv find it and record it in the lockfile, since renv does not
# read the linter configuration.
if (!requireNamespace("cyclocomp", quietly = TRUE)) {
  stop("The cyclocomp package, needed by cyclocomp_linter(), is not installed.", call. = FALSE)
}

# A linter that cannot run makes lintr warn and skip it, which would let the
# gate pass with a check silently missing, so every warning is an error here.
results <- withr::with_options(list(warn = 2L), {
  # The object usage linter resolves the names used in a function body against
  # the namespace of the package being linted, and quietly falls back to the
  # global environment when that namespace cannot be found. The package is
  # never installed during development, so it is loaded from source first;
  # otherwise every call from one file of the package to another would be
  # reported.
  pkgload::load_all(package_dir, quiet = TRUE)

  # The package is linted as a package so that its test files are included;
  # the scripts are not part of it and are linted as plain files.
  list(
    lintr::lint_package(package_dir),
    lintr::lint_dir(file.path(package_dir, "scripts"))
  )
})

for (lints in results) {
  print(lints)
}

lint_count <- sum(lengths(results))
if (lint_count > 0L) {
  stop(sprintf("Found %d lint(s).", lint_count), call. = FALSE)
}
