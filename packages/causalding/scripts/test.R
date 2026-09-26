# Runs the test suite of the package, failing on any failed expectation and on
# any warning raised while the tests run.
#
# Run from the repository root, where renv activates the project library:
#   Rscript packages/causalding/scripts/test.R

testthat::test_local(
  file.path("packages", "causalding"),
  stop_on_failure = TRUE,
  stop_on_warning = TRUE
)
