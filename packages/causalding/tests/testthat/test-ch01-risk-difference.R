test_that("it reproduces the aggregated Berkeley estimate of Ding (2024, Section 1.4)", {
  counts <- matrix(c(1198L, 557L, 1493L, 1278L), nrow = 2L)

  expect_identical(risk_difference(counts), 1198L / 2691L - 557L / 1835L)
  expect_identical(signif(risk_difference(counts), 7L), 0.1416454)
})

test_that("it vanishes when the rows are proportional, as under independence", {
  expect_identical(risk_difference(matrix(c(2L, 4L, 6L, 12L), nrow = 2L)), 0.0)
})

test_that("it changes sign when the treatment levels are swapped", {
  counts <- matrix(c(3L, 5L, 7L, 2L), nrow = 2L)

  expect_identical(risk_difference(counts[2L:1L, ]), -risk_difference(counts))
})

test_that("it attains the bounds of the unit interval", {
  expect_identical(risk_difference(matrix(c(5L, 0L, 0L, 7L), nrow = 2L)), 1.0)
  expect_identical(risk_difference(matrix(c(0L, 5L, 7L, 0L), nrow = 2L)), -1.0)
})

test_that("it gives the same estimate for integer, double and table storage", {
  counts <- matrix(c(3L, 5L, 7L, 2L), nrow = 2L)
  expected <- 3L / 10L - 5L / 7L

  expect_identical(risk_difference(counts), expected)
  expect_identical(risk_difference(matrix(c(3.0, 5.0, 7.0, 2.0), nrow = 2L)), expected)
  expect_identical(risk_difference(as.table(counts)), expected)
})

test_that("it rejects input that is not a two-by-two numeric matrix", {
  expect_error(risk_difference(c(1L, 2L, 3L, 4L)), "Assertion on 'counts' failed")
  expect_error(risk_difference(matrix(1L, nrow = 2L, ncol = 3L)), "Assertion on 'counts' failed")
  expect_error(risk_difference(matrix("1", nrow = 2L, ncol = 2L)), "Assertion on 'counts' failed")
})

test_that("it rejects counts that are missing, infinite, negative or fractional", {
  expect_error(
    risk_difference(matrix(c(1L, NA, 1L, 1L), nrow = 2L)),
    "Assertion on 'counts' failed"
  )
  expect_error(
    risk_difference(matrix(c(1.0, Inf, 1.0, 1.0), nrow = 2L)),
    "Assertion on 'counts' failed"
  )
  expect_error(
    risk_difference(matrix(c(1L, -1L, 1L, 1L), nrow = 2L)),
    "Assertion on 'counts' failed"
  )
  expect_error(
    risk_difference(matrix(c(1.0, 0.5, 1.0, 1.0), nrow = 2L)),
    "Assertion on 'counts' failed"
  )
})

test_that("it rejects a treatment level without units", {
  expect_error(
    risk_difference(matrix(c(0L, 1L, 0L, 1L), nrow = 2L)),
    "Each row of `counts` must contain at least one unit."
  )
})
