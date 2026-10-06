# A small data set whose regressions can be checked one by one against lm().
make_data <- function(n = 60L) {
  withr::with_seed(42L, {
    x1 <- stats::rnorm(n)
    x2 <- stats::rnorm(n)
    z <- as.numeric(x1 + stats::rnorm(n) > 0.0)
    y <- 1.0 + 0.5 * z + 2.0 * x1 - x2 + stats::rnorm(n)
  })
  data.frame(y = y, z = z, x1 = x1, x2 = x2)
}

test_that("it fits one regression per subset, from none to all covariates", {
  search <- specification_search(make_data(), "y", "z", c("x1", "x2"))

  expect_identical(nrow(search), 4L)
  expect_identical(search$x1, c(FALSE, TRUE, FALSE, TRUE))
  expect_identical(search$x2, c(FALSE, FALSE, TRUE, TRUE))
})

test_that("each coefficient matches summary(lm()) and confint()", {
  data <- make_data()
  search <- specification_search(data, "y", "z", c("x1", "x2"), level = 0.1)

  for (row in seq_len(nrow(search))) {
    included <- c("x1", "x2")[c(search$x1[[row]], search$x2[[row]])]
    fit <- stats::lm(stats::reformulate(c("z", included), response = "y"), data = data)
    expected <- summary(fit)$coefficients["z", ]
    interval <- stats::confint(fit, "z", level = 0.9)

    expect_equal(search$estimate[[row]], expected[["Estimate"]], tolerance = 1e-12)
    expect_equal(search$std_error[[row]], expected[["Std. Error"]], tolerance = 1e-12)
    expect_equal(search$p_value[[row]], expected[["Pr(>|t|)"]], tolerance = 1e-10)
    expect_equal(search$conf_low[[row]], interval[[1L]], tolerance = 1e-12)
    expect_equal(search$conf_high[[row]], interval[[2L]], tolerance = 1e-12)
  }
})

test_that("significance follows the p-value and the sign of the estimate", {
  search <- specification_search(make_data(), "y", "z", c("x1", "x2"))
  significant <- search$p_value < 0.05

  expect_identical(search$significance[!significant], rep("none", sum(!significant)))
  expect_true(all(search$estimate[search$significance == "positive"] > 0.0))
  expect_true(all(search$estimate[search$significance == "negative"] < 0.0))
  expect_true(all(search$significance[significant] != "none"))
})

test_that("a negative estimate can be negatively significant", {
  # The treated units have larger x1, which raises y, so the effect of z must
  # be well below zero to stay negative when x1 is left out.
  data <- make_data()
  data$y <- data$y - 6.0 * data$z

  search <- specification_search(data, "y", "z", "x1")

  expect_identical(search$significance, c("negative", "negative"))
})

test_that("it rejects collinear covariates", {
  data <- make_data()
  data$x3 <- 2.0 * data$x1

  expect_error(
    specification_search(data, "y", "z", c("x1", "x3")),
    "The covariates are collinear in a regression."
  )
})

test_that("it rejects invalid arguments", {
  data <- make_data()

  expect_error(specification_search(data, "w", "z", "x1"), "Assertion on 'outcome' failed")
  expect_error(specification_search(data, "y", "y", "x1"), "Assertion on 'treatment' failed")
  expect_error(specification_search(data, "y", "z", "z"), "Assertion on 'covariates' failed")
  expect_error(
    specification_search(data, "y", "z", c("x1", "x1")),
    "Assertion on 'covariates' failed"
  )
  expect_error(
    specification_search(data, "y", "z", "x1", level = 1.0),
    "Assertion on '0 < level < 1' failed"
  )
  data$x2 <- as.character(data$x2)
  expect_error(specification_search(data, "y", "z", "x2"), "Assertion on 'x2' failed")
})
