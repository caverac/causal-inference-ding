test_that("it reads the data of Section 1.2.1", {
  data <- cps1re74()

  expect_identical(nrow(data), 16177L)
  expect_identical(sum(data$treat), 185L)
  expect_named(
    data,
    c(
      "treat",
      "age",
      "educ",
      "black",
      "hispan",
      "married",
      "nodegree",
      "re74",
      "re75",
      "re78",
      "u74",
      "u75"
    )
  )
})

test_that("it adds the indicators of zero earnings", {
  data <- cps1re74()

  expect_identical(data$u74, as.numeric(data$re74 == 0.0))
  expect_identical(data$u75, as.numeric(data$re75 == 0.0))
})

test_that("its treated units are those of the experiment of Section 4.5.3", {
  # The mean outcome of the 185 treated units in the lalonde data of the
  # Matching package, which Section 4.5.3 of the book analyzes.
  data <- cps1re74()

  expect_equal(mean(data$re78[data$treat == 1L]), 6349.144, tolerance = 1e-7)
})

test_that("it reproduces the two regressions printed in Section 1.2.1", {
  data <- cps1re74()
  all_covariates <- summary(stats::lm(re78 ~ ., data = data))$coefficients["treat", ]
  no_covariates <- summary(stats::lm(re78 ~ treat, data = data))$coefficients["treat", ]

  columns <- c("Estimate", "Std. Error")
  expect_identical(round(unname(all_covariates[columns]), 3L), c(1067.546, 554.060))
  expect_identical(round(unname(no_covariates[columns]), 3L), c(-8506.495, 712.766))
})
