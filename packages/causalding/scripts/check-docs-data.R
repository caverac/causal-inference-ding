# Fails when the committed data drawn by the documentation site no longer match
# what the package computes.
#
# The data are recomputed into a temporary directory and compared with the
# committed files. Text and logicals must match exactly, and numbers to a
# relative tolerance of 1e-8, which no change of a count can meet. Least squares fits, such as those
# of Problem 1.4, agree only to about 1e-10 between BLAS libraries and thread
# counts, so their last written digits differ between a laptop and CI even
# when nothing has changed; a change in the package is far larger.
#
# Run from the repository root, where renv activates the project library:
#   Rscript packages/causalding/scripts/check-docs-data.R

pkgload::load_all(file.path("packages", "causalding"), quiet = TRUE)

committed_dir <- file.path("packages", "docs", "src", "data", "generated")
fresh_dir <- tempfile("docs-data-")
dir.create(fresh_dir)
fresh <- write_docs_data(fresh_dir)

read <- function(path) jsonlite::read_json(path, simplifyVector = TRUE)
matches <- function(name) {
  committed <- file.path(committed_dir, name)
  file.exists(committed) &&
    isTRUE(all.equal(read(committed), read(file.path(fresh_dir, name)), tolerance = 1e-8))
}

names <- basename(fresh)
stale <- names[!vapply(names, matches, logical(1L))]
orphaned <- setdiff(list.files(committed_dir, pattern = "[.]json$"), names)

if (length(stale) > 0L || length(orphaned) > 0L) {
  stop(
    "The docs data are stale. Run 'yarn r:export' and commit the result.\n",
    if (length(stale) > 0L) paste0("  Differ: ", toString(stale), "\n"),
    if (length(orphaned) > 0L) paste0("  No longer generated: ", toString(orphaned), "\n"),
    call. = FALSE
  )
}
message("The docs data match what the package computes.")
