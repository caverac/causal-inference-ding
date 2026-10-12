result <- lalonde_correlations()
covariates <- result$covariates

test_that("it orders the variables by group", {
  expect_identical(
    result$variables,
    c(
      "re78",
      "treat",
      "re74",
      "re75",
      "u74",
      "u75",
      "age",
      "educ",
      "black",
      "hispan",
      "married",
      "nodegree"
    )
  )
  expect_identical(covariates$name, result$variables[-c(1L, 2L)])
  expect_identical(covariates$group, result$groups[-c(1L, 2L)])
})

test_that("the correlation matrix is that of the data", {
  cps <- cps1re74()

  expect_identical(result$correlations, unname(stats::cor(cps[result$variables])))
  expect_identical(diag(result$correlations), rep(1.0, 12L))
})

test_that("each shift is the change of the coefficient when its covariate is added", {
  cps <- cps1re74()
  coefficient <- function(formula) stats::coef(stats::lm(formula, data = cps))[["treat"]]

  expect_equal(result$baseline, coefficient(re78 ~ treat), tolerance = 1e-10)
  for (row in seq_len(nrow(covariates))) {
    formula <- stats::reformulate(c("treat", covariates$name[[row]]), response = "re78")
    expect_equal(covariates$estimate[[row]], coefficient(formula), tolerance = 1e-10)
  }
  expect_identical(covariates$shift, covariates$estimate - result$baseline)
})

test_that("the shifts follow the omitted variable formula written in correlations", {
  formula_shift <- -result$shift_scale *
    covariates$rho_zx *
    covariates$rho_yx_z /
    sqrt(1.0 - covariates$rho_zx^2L)

  expect_equal(formula_shift, covariates$shift, tolerance = 1e-10)
})

test_that("every covariate but hispan raises the coefficient, re75 the most", {
  raises <- covariates$name[covariates$shift > 0.0]

  expect_identical(setdiff(covariates$name, raises), "hispan")
  expect_identical(covariates$name[[which.max(covariates$shift)]], "re75")
  expect_identical(round(max(covariates$shift)), 8435.0)
})
