# Entry point for the tests under R CMD check. test_check() attaches testthat
# and the installed package itself before it runs the files in tests/testthat.
testthat::test_check("causalding")
