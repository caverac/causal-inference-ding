# Measures the line coverage of the package under its test suite and fails
# unless every line is covered, listing the lines that are not.
#
# Run from the repository root, where renv activates the project library:
#   Rscript packages/causalding/scripts/coverage.R

required_percent <- 100.0

coverage <- covr::package_coverage(file.path("packages", "causalding"), type = "tests")
print(coverage)

percent <- covr::percent_coverage(coverage)
if (percent < required_percent) {
  # Read from the coverage data rather than covr::zero_coverage(), which also
  # tries to fill the RStudio markers pane and fails outside RStudio.
  lines <- as.data.frame(coverage)
  print(lines[lines$value == 0L, c("filename", "first_line", "last_line")], row.names = FALSE)
  stop(
    sprintf("Coverage is %.2f%%, below the required %.0f%%.", percent, required_percent),
    call. = FALSE
  )
}
