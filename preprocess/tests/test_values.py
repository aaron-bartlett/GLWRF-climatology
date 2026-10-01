"""Decoded values against the source NetCDF: units, quantization, regridding sanity."""

import numpy as np
import pytest
import xarray as xr

import build_stores
from build_stores import VARIABLES, to_lonlat


@pytest.fixture(scope="module")
def expected(source):
    """Source regridded in float: the store minus quantization."""
    return build_stores.regrid(source)[0]


def test_month_coordinate(decoded):
    assert list(decoded.month.values) == list(range(1, 13))


def test_quantization_roundtrip(decoded, expected):
    """Comparing against the float regrid isolates quantization error (≤ half a step)."""
    for var in VARIABLES:
        step = decoded[var].encoding["scale_factor"]
        diff = np.abs(decoded[var].values - expected[var].values)
        assert np.nanmax(diff) <= step / 2 + 1e-9, var
        assert np.array_equal(np.isnan(decoded[var].values), np.isnan(expected[var].values)), var


def test_values_within_source_range(decoded, source):
    """Bilinear interpolation never extrapolates beyond the source min/max (in display units)."""
    for var in VARIABLES:
        step = decoded[var].encoding["scale_factor"]
        assert float(decoded[var].min()) >= float(source[var].min()) - step, var
        assert float(decoded[var].max()) <= float(source[var].max()) + step, var


def test_domain_means_match_source(decoded, source):
    """Area-weighted domain mean (per month) stays within 5% of the source spread (different grids, same field).

    A Mercator cell covers cos²(lat) of its nominal area; the native Lambert cells are near equal-area."""
    _, lat = to_lonlat.transform(np.zeros(decoded.sizes["y"]), decoded.y.values)
    area = xr.DataArray(np.cos(np.radians(lat)) ** 2, dims="y")
    for var in VARIABLES:
        mean = decoded[var].weighted(area).mean(["y", "x"]).values
        diff = mean - source[var].mean(["south_north", "west_east"]).values
        assert np.all(np.abs(diff) < 0.05 * float(source[var].std())), var


def test_temperature_converted_to_celsius(decoded):
    assert -40 < float(decoded.mean_T2.min()) and float(decoded.mean_T2.max()) < 40


def test_seasonal_cycle(decoded):
    means = decoded.mean_T2.mean(["y", "x"]).values
    assert means.argmin() in (0, 1, 11)  # Dec–Feb coldest
    assert means.argmax() in (5, 6, 7)  # Jun–Aug warmest


def test_mostly_valid(decoded):
    """Only the corners outside the rotated native domain should be missing."""
    for var in VARIABLES:
        assert np.isnan(decoded[var].values).mean() < 0.2, var
