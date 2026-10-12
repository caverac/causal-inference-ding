test_that("without truncation it returns the mean", {
  expect_identical(truncated_normal_mean(1.5, 2.0, -Inf, Inf), 1.5)
})

test_that("it agrees with numerical integration", {
  cases <- list(c(0.0, 1.0, 0.5, Inf), c(0.0, 1.0, -Inf, 0.5), c(2.0, 3.0, -1.0, 4.0))
  for (case in cases) {
    density <- function(x) stats::dnorm(x, case[[1L]], case[[2L]])
    mass <- stats::integrate(density, case[[3L]], case[[4L]])$value
    moment <- stats::integrate(function(x) x * density(x), case[[3L]], case[[4L]])$value

    expect_equal(
      truncated_normal_mean(case[[1L]], case[[2L]], case[[3L]], case[[4L]]),
      moment / mass,
      tolerance = 1e-8
    )
  }
})

test_that("symmetric limits give the mean, and mirrored limits mirrored means", {
  expect_equal(truncated_normal_mean(0.0, 1.0, -1.0, 1.0), 0.0, tolerance = 1e-15)
  expect_equal(
    truncated_normal_mean(0.0, 1.0, 0.5, Inf),
    -truncated_normal_mean(0.0, 1.0, -Inf, -0.5),
    tolerance = 1e-15
  )
})

test_that("it gives the difference in means of the perfect doctor of Problem 2.1", {
  # Y(0) ~ N(0, 1), Y(1) = 2 Y(0) - 0.5 and Z = 1(Y(0) >= 0.5).
  treated <- 2.0 * truncated_normal_mean(0.0, 1.0, 0.5, Inf) - 0.5
  control <- truncated_normal_mean(0.0, 1.0, -Inf, 0.5)
  draws <- withr::with_seed(1L, stats::rnorm(1000000L))
  chosen <- draws >= 0.5

  expect_identical(round(treated - control, 4L), 2.2913)
  expect_equal(
    mean(2.0 * draws[chosen] - 0.5) - mean(draws[!chosen]),
    treated - control,
    tolerance = 1e-3
  )
})

test_that("it rejects a non-positive sigma and empty intervals", {
  expect_error(truncated_normal_mean(0.0, 0.0, 0.0, 1.0), "Assertion on 'sigma > 0' failed")
  expect_error(truncated_normal_mean(0.0, 1.0, 1.0, 1.0), "Assertion on 'lower < upper' failed")
  expect_error(truncated_normal_mean(Inf, 1.0, 0.0, 1.0), "Assertion on 'mu' failed")
})
