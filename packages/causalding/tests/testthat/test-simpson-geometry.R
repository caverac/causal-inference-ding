# counts[z, y, x]: for X = 1, the successes of Z = 1 and Z = 0, then their
# failures; the same for X = 0.
postcard <- array(c(50L, 6L, 50L, 4L, 1L, 20L, 9L, 80L), dim = c(2L, 2L, 2L))
# The two-by-two tables of the subgroups X = 1 and X = 0.
postcard_tables <- asplit(postcard, 3L)

test_that("each subgroup vector holds the failures and successes of its arm", {
  geometry <- simpson_geometry(postcard)

  expect_identical(
    geometry$treated$subgroups[["1"]][c("failures", "successes")],
    list(
      failures = 50L,
      successes = 50L
    )
  )
  expect_identical(
    geometry$treated$subgroups[["0"]][c("failures", "successes")],
    list(
      failures = 9L,
      successes = 1L
    )
  )
  expect_identical(
    geometry$control$subgroups[["1"]][c("failures", "successes")],
    list(
      failures = 4L,
      successes = 6L
    )
  )
  expect_identical(
    geometry$control$subgroups[["0"]][c("failures", "successes")],
    list(
      failures = 80L,
      successes = 20L
    )
  )
})

test_that("the aggregated vector of an arm is the sum of its subgroup vectors", {
  geometry <- simpson_geometry(postcard)

  for (arm in geometry[c("treated", "control")]) {
    for (count in c("failures", "successes")) {
      expect_identical(
        arm$aggregated[[count]],
        arm$subgroups[["1"]][[count]] + arm$subgroups[["0"]][[count]]
      )
    }
  }
})

test_that("each rate is the share of successes in its vector", {
  geometry <- simpson_geometry(postcard)

  expect_identical(geometry$treated$subgroups[["1"]]$rate, 0.5)
  expect_identical(geometry$control$subgroups[["0"]]$rate, 0.2)
  expect_identical(geometry$treated$aggregated$rate, 51.0 / 110.0)
  expect_identical(geometry$control$aggregated$rate, 26.0 / 110.0)
})

test_that("an aggregated rate averages the subgroup rates with the arm's own shares", {
  geometry <- simpson_geometry(postcard)

  expect_identical(geometry$treated$share, 100.0 / 110.0)
  expect_identical(geometry$control$share, 10.0 / 110.0)
  for (arm in geometry[c("treated", "control")]) {
    expect_equal(
      standardized_rate(
        c(arm$subgroups[["1"]]$rate, arm$subgroups[["0"]]$rate),
        c(arm$share, 1.0 - arm$share)
      ),
      arm$aggregated$rate,
      tolerance = 1e-15
    )
  }
})

test_that("the risk differences are those of the slices and of their sum", {
  differences <- simpson_geometry(postcard)$risk_difference

  expect_identical(differences[["1"]], risk_difference(postcard_tables[[1L]]))
  expect_identical(differences[["0"]], risk_difference(postcard_tables[[2L]]))
  expect_identical(
    differences$aggregated,
    risk_difference(postcard_tables[[1L]] + postcard_tables[[2L]])
  )
})

test_that("the aggregated difference vanishes at the share where it changes sign", {
  geometry <- simpson_geometry(postcard)
  at <- geometry$sign_change_at
  rates <- c(geometry$treated$subgroups[["1"]]$rate, geometry$treated$subgroups[["0"]]$rate)

  expect_equal(at, 15.0 / 44.0, tolerance = 1e-15)
  expect_equal(
    standardized_rate(rates, c(at, 1.0 - at)) - geometry$control$aggregated$rate,
    0.0,
    tolerance = 1e-15
  )
})

test_that("there is no sign change when the treated rates are equal", {
  # Both subgroups of the treated arm succeed at rate 1/2, so moving its share
  # leaves its aggregated rate, and the aggregated difference, unchanged.
  counts <- array(c(5L, 6L, 5L, 4L, 1L, 20L, 1L, 80L), dim = c(2L, 2L, 2L))

  expect_identical(simpson_geometry(counts)$sign_change_at, NA_real_)
})

test_that("there is no sign change when no share makes the difference vanish", {
  # The treated arm succeeds more often than the control arm in both
  # subgroups and in the aggregate, whatever its share.
  counts <- array(c(9L, 2L, 1L, 8L, 8L, 1L, 2L, 9L), dim = c(2L, 2L, 2L))

  expect_identical(simpson_geometry(counts)$sign_change_at, NA_real_)
})

test_that("it rejects input that is not a two-by-two-by-two table of counts", {
  expect_error(simpson_geometry(matrix(1L, 2L, 2L)), "Assertion on 'counts' failed")
  expect_error(
    simpson_geometry(array(1L, dim = c(2L, 3L, 2L))),
    "Assertion on 'dim(counts)' failed",
    fixed = TRUE
  )
  expect_error(
    simpson_geometry(array(c(-1L, rep(1L, 7L)), dim = c(2L, 2L, 2L))),
    "Assertion on 'counts' failed"
  )
  expect_error(
    simpson_geometry(array(c(0.5, rep(1.0, 7L)), dim = c(2L, 2L, 2L))),
    "Assertion on 'counts' failed"
  )
})

test_that("it rejects an arm without units in a subgroup", {
  counts <- array(c(0L, 1L, 0L, 1L, rep(1L, 4L)), dim = c(2L, 2L, 2L))

  expect_error(
    simpson_geometry(counts),
    "Assertion on 'every arm of every subgroup has a unit' failed"
  )
})
