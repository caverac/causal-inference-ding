# Runs R CMD check with the CRAN policies and fails on any NOTE, WARNING or
# ERROR.
#
# R has no static type checker ready for production use, and this check is the
# closest substitute: it reports undefined global variables and functions,
# undeclared dependencies, calls that do not match the signature of the
# function they target, and documentation that disagrees with the code. Those
# findings are NOTEs, which is why a NOTE fails the check here.
#
# Two steps of the CRAN policies query remote services, and neither concerns
# the code. The remote part of the incoming feasibility check asks CRAN whether
# the package is already published, which it never will be, and probes the URLs
# in DESCRIPTION; the timestamp check asks an online clock for the time. Both
# would make the result depend on the network, so only those parts are off. The
# local part of the incoming feasibility check still runs.
#
# Run from the repository root, where renv activates the project library:
#   Rscript packages/causalding/scripts/check.R

rcmdcheck::rcmdcheck(
  file.path("packages", "causalding"),
  args = c("--as-cran", "--no-manual"),
  build_args = "--no-manual",
  error_on = "note",
  env = c(
    `_R_CHECK_CRAN_INCOMING_REMOTE_` = "false",
    `_R_CHECK_FUTURE_FILE_TIMESTAMPS_` = "false"
  )
)
