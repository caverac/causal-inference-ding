test_that("the postcard lowers buying in each segment and raises it in the aggregate", {
  postcard <- yule_simpson_examples()$postcard

  expect_equal(postcard$risk_difference[["1"]], -0.1, tolerance = 1e-15)
  expect_equal(postcard$risk_difference[["0"]], -0.1, tolerance = 1e-15)
  expect_identical(postcard$risk_difference$aggregated, 51.0 / 110.0 - 26.0 / 110.0)
})

test_that("the postcard's mailed and held-out customers match the solution's table", {
  postcard <- yule_simpson_examples()$postcard

  expect_identical(
    postcard$treated$aggregated$failures + postcard$treated$aggregated$successes,
    110L
  )
  expect_identical(
    postcard$control$aggregated$failures + postcard$control$aggregated$successes,
    110L
  )
  expect_identical(postcard$treated$share, 100.0 / 110.0)
  expect_identical(postcard$control$share, 10.0 / 110.0)
})

test_that("the ramp-up reproduces Table 1 of Crook et al. (2009)", {
  ramp_up <- yule_simpson_examples()$ramp_up
  visitors <- function(vector) vector$failures + vector$successes

  expect_identical(visitors(ramp_up$treated$subgroups[["1"]]), 10000L)
  expect_identical(visitors(ramp_up$treated$subgroups[["0"]]), 500000L)
  expect_identical(visitors(ramp_up$control$subgroups[["1"]]), 990000L)
  expect_identical(visitors(ramp_up$control$subgroups[["0"]]), 500000L)
  expect_identical(ramp_up$treated$aggregated$successes, 6230L)
  expect_identical(ramp_up$control$aggregated$successes, 25000L)
  # The rates printed in the paper, in percent; its 1.20% for the treatment
  # over both days is 6230 / 510000 = 1.22%.
  expect_identical(round(100.0 * ramp_up$treated$subgroups[["1"]]$rate, 2L), 2.30)
  expect_identical(round(100.0 * ramp_up$control$subgroups[["1"]]$rate, 2L), 2.02)
  expect_identical(round(100.0 * ramp_up$treated$subgroups[["0"]]$rate, 2L), 1.20)
  expect_identical(round(100.0 * ramp_up$control$subgroups[["0"]]$rate, 2L), 1.00)
  expect_identical(round(100.0 * ramp_up$control$aggregated$rate, 2L), 1.68)
  expect_identical(round(100.0 * ramp_up$treated$aggregated$rate, 2L), 1.22)
})

test_that("the ramp-up treatment converts better on each day and worse overall", {
  differences <- yule_simpson_examples()$ramp_up$risk_difference

  expect_gt(differences[["1"]], 0.0)
  expect_gt(differences[["0"]], 0.0)
  expect_lt(differences$aggregated, 0.0)
})

test_that("in both examples the sign changes between the shares of the two arms", {
  for (example in yule_simpson_examples()) {
    at <- example$sign_change_at

    expect_gt(at, min(example$treated$share, example$control$share))
    expect_lt(at, max(example$treated$share, example$control$share))
  }
})
