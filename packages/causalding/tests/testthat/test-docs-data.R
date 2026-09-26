test_that("it writes one JSON file per registered dataset", {
  dir <- withr::local_tempdir()

  paths <- write_docs_data(dir)

  expect_identical(basename(paths), "berkeley-admissions.json")
  expect_true(all(file.exists(paths)))
})

test_that("the written file round-trips to the computed values", {
  dir <- withr::local_tempdir()

  written <- jsonlite::read_json(write_docs_data(dir)[[1L]], simplifyVector = TRUE)
  expected <- berkeley_admissions()

  expect_named(written, names(expected))
  expect_identical(written$aggregated$applicants_male, expected$aggregated$applicants_male)
  expect_equal(written$aggregated, expected$aggregated, tolerance = 1e-14)
  expect_equal(written$standardized, expected$standardized, tolerance = 1e-14)
  expect_equal(written$departments, expected$departments, tolerance = 1e-14)
})

test_that("it returns the paths invisibly", {
  dir <- withr::local_tempdir()

  expect_invisible(write_docs_data(dir))
})

test_that("it rejects a directory that does not exist", {
  missing <- file.path(withr::local_tempdir(), "missing")

  expect_error(write_docs_data(missing), "Assertion on 'dir' failed")
})
