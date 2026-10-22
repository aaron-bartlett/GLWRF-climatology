"""Lake-surface fields: units, lake/basin masking, and the categorical basin variable."""

import numpy as np
import xarray as xr

from build_stores import source_path

LAKE_ONLY = ("ICEFRAC_mean", "TLAKE_sfc_mean", "lake_ice_days")


def test_lake_file_shares_the_monthly_grid():
    """build_stores takes coordinates from the monthly file for every kind."""
    lake = xr.open_dataset(source_path("lake_surface", "historical"))
    geo = xr.open_dataset(source_path("monthly_mean", "historical"))
    assert np.allclose(lake.XLAT, geo.XLAT) and np.allclose(lake.XLONG, geo.XLONG)


def test_display_units(decoded):
    for var in ("TLAKE_sfc_mean", "TLAKE_sfc_p95", "TLAKE_sfc_p99"):
        assert -30 < float(decoded[var].min()) and float(decoded[var].max()) < 35, var
    assert 0 <= float(decoded.ICEFRAC_mean.min()) and float(decoded.ICEFRAC_mean.max()) <= 100


def test_lake_only_fields_are_masked(decoded):
    """Valid only over the lakes, and never outside the native domain."""
    domain = decoded.mean_T2.isel(month=0).notnull().values
    for var in LAKE_ONLY:
        da = decoded[var].isel(month=0) if "month" in decoded[var].dims else decoded[var]
        valid = da.notnull().values
        assert 0.03 < valid.mean() < 0.3, var
        assert not np.any(valid & ~domain), var


def test_basin_codes(stores):
    ref = stores["historical"].lake_basin.values
    codes = ref[~np.isnan(ref)]
    assert np.array_equal(codes, np.round(codes)) and set(np.unique(codes)) == {1, 2, 3, 4, 5}
    for scn, ds in stores.items():
        assert np.array_equal(ds.lake_basin.values, ref, equal_nan=True), scn


def test_basin_catalog_entry(catalog):
    meta = catalog["variables"]["lake_basin"]
    assert meta["range"] == [1, 5] and not meta["month"]
    assert len(meta["categories"]) == len(meta["colormap"]) == len(meta["centers"]) == 5
    b = catalog["bounds"]
    for lon, lat in meta["centers"]:
        assert b["west"] < lon < b["east"] and b["south"] < lat < b["north"]
