#' Datasets drawn by the documentation site
#'
#' Registry of the data the documentation site plots. Each entry maps the
#' base name of a JSON file to the function that computes its contents. The
#' site imports the files at build time, so their shape is part of the
#' contract with the TypeScript components that read them.
#'
#' @return (`list`) Named list of functions without arguments.
#' @keywords internal
#' @noRd
docs_datasets <- function() {
  list(
    `berkeley-admissions` = berkeley_admissions,
    `resume-callbacks` = resume_callbacks
  )
}

#' Write the data drawn by the documentation site
#'
#' Evaluates every entry of the registry of documentation datasets and writes
#' each result to `<name>.json` in `dir`. Numbers are written with 15
#' significant digits, so the files change only when a result does.
#'
#' @param dir (`character(1)`) Existing, writable directory that receives the
#'   files.
#' @return (`character`) Paths of the files written, invisibly.
#' @export
#' @examples
#' dir <- tempfile()
#' dir.create(dir)
#' write_docs_data(dir)
write_docs_data <- function(dir) {
  checkmate::assert_directory_exists(dir, access = "w")

  datasets <- docs_datasets()
  paths <- file.path(dir, paste0(names(datasets), ".json"))
  for (index in seq_along(datasets)) {
    jsonlite::write_json(
      datasets[[index]](),
      paths[[index]],
      auto_unbox = TRUE,
      digits = NA,
      pretty = TRUE
    )
  }

  invisible(paths)
}
