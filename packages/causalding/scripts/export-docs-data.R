# Writes the data drawn by the documentation site, one JSON file per dataset,
# into `packages/docs/src/data/generated`. The files are committed so the site
# builds without R, and CI fails when they no longer match what the package
# computes.
#
# Run from the repository root, where renv activates the project library:
#   Rscript packages/causalding/scripts/export-docs-data.R

# load_all() attaches the package, so its exported functions are in scope.
pkgload::load_all(file.path("packages", "causalding"), quiet = TRUE)

write_docs_data(file.path("packages", "docs", "src", "data", "generated"))
