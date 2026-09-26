test_that("it averages the rates with the given weights", {
  expect_equal(standardized_rate(c(0.2, 0.6), c(0.75, 0.25)), 0.3, tolerance = 1e-15)
})

test_that("it returns the rate of a single stratum", {
  expect_identical(standardized_rate(0.4, 1.0), 0.4)
})

test_that("it recovers the aggregated rate from a group's own weights", {
  admitted <- c(30L, 5L, 12L)
  applicants <- c(50L, 40L, 60L)

  expect_equal(
    standardized_rate(admitted / applicants, applicants / sum(applicants)),
    sum(admitted) / sum(applicants),
    tolerance = 1e-15
  )
})

test_that("it rejects rates outside the unit interval or missing", {
  expect_error(standardized_rate(c(0.5, 1.5), c(0.5, 0.5)), "Assertion on 'rates' failed")
  expect_error(standardized_rate(c(0.5, -0.1), c(0.5, 0.5)), "Assertion on 'rates' failed")
  expect_error(standardized_rate(c(0.5, NA), c(0.5, 0.5)), "Assertion on 'rates' failed")
  expect_error(standardized_rate(numeric(0L), numeric(0L)), "Assertion on 'rates' failed")
})

test_that("it rejects weights that are negative, missing or of another length", {
  expect_error(standardized_rate(c(0.5, 0.5), c(1.5, -0.5)), "Assertion on 'weights' failed")
  expect_error(standardized_rate(c(0.5, 0.5), c(1.0, NA)), "Assertion on 'weights' failed")
  expect_error(standardized_rate(c(0.5, 0.5), 1.0), "Assertion on 'weights' failed")
})

test_that("it rejects weights that do not sum to one", {
  expect_error(standardized_rate(c(0.5, 0.5), c(0.5, 0.4)), "`weights` must sum to one.")
})
