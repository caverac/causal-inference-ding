test_that("it writes one JSON file per registered dataset", {
  dir <- withr::local_tempdir()

  paths <- write_docs_data(dir)

  expect_identical(
    basename(paths),
    c(
      "berkeley-admissions.json",
      "lalonde-correlations.json",
      "lalonde-specifications.json",
      "resume-callbacks.json",
      "yule-simpson-examples.json"
    )
  )
  expect_true(all(file.exists(paths)))
})

test_that("the written files round-trip to the computed values", {
  dir <- withr::local_tempdir()

  paths <- write_docs_data(dir)
  read <- function(name) {
    jsonlite::read_json(paths[basename(paths) == paste0(name, ".json")], simplifyVector = TRUE)
  }

  written <- read("berkeley-admissions")
  expected <- berkeley_admissions()
  expect_named(written, names(expected))
  expect_identical(written$aggregated$applicants_male, expected$aggregated$applicants_male)
  expect_equal(written$aggregated, expected$aggregated, tolerance = 1e-14)
  expect_equal(written$standardized, expected$standardized, tolerance = 1e-14)
  expect_equal(written$departments, expected$departments, tolerance = 1e-14)

  expect_equal(read("resume-callbacks"), resume_callbacks(), tolerance = 1e-14)
  expect_equal(read("yule-simpson-examples"), yule_simpson_examples(), tolerance = 1e-14)
  expect_equal(read("lalonde-correlations"), lalonde_correlations(), tolerance = 1e-14)

  lalonde <- read("lalonde-specifications")
  expected <- lalonde_specifications()
  columns <- setdiff(names(expected$specifications), "included")
  summaries <- c("covariates", "level", "counts", "earnings")
  expect_equal(lalonde[summaries], expected[summaries], tolerance = 1e-14)
  expect_equal(lalonde$specifications[columns], expected$specifications[columns], tolerance = 1e-14)
  expect_identical(lalonde$specifications$included, expected$specifications$included)
})

test_that("it returns the paths invisibly", {
  dir <- withr::local_tempdir()

  expect_invisible(write_docs_data(dir))
})

test_that("it rejects a directory that does not exist", {
  missing <- file.path(withr::local_tempdir(), "missing")

  expect_error(write_docs_data(missing), "Assertion on 'dir' failed")
})
