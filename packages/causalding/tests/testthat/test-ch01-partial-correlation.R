test_that("it gives the numerical example of Problem 1.3", {
  expect_equal(partial_correlation(0.2, 0.6, 0.6), -0.25, tolerance = 1e-15)
})

test_that("it is the correlation of the residuals of a regression on the third variable", {
  data <- withr::with_seed(7L, {
    c_values <- stats::rnorm(200L)
    a_values <- c_values + stats::rnorm(200L)
    b_values <- -0.5 * c_values + stats::rexp(200L)
    data.frame(a = a_values, b = b_values, c = c_values)
  })
  rho <- stats::cor(data)

  expect_equal(
    partial_correlation(rho[["a", "b"]], rho[["a", "c"]], rho[["b", "c"]]),
    stats::cor(stats::resid(stats::lm(a ~ c, data)), stats::resid(stats::lm(b ~ c, data))),
    tolerance = 1e-12
  )
})

test_that("it rejects correlations outside [-1, 1] and a perfect correlation with C", {
  expect_error(partial_correlation(1.2, 0.1, 0.1), "Assertion on 'rho_ab' failed")
  expect_error(partial_correlation(0.2, -1.5, 0.1), "Assertion on 'rho_ac' failed")
  expect_error(partial_correlation(0.2, 0.1, 2.0), "Assertion on 'rho_bc' failed")
  expect_error(partial_correlation(0.2, 1.0, 0.1), "Assertion on '|rho_ac|, |rho_bc| < 1' failed")
})
