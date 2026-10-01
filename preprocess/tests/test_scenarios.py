"""Scenario stores: labeled correctly, built from the right files, and interchangeable for the frontend."""

import xarray as xr

from build_stores import SCENARIOS, VARIABLES, source_path


def test_source_files_match_scenario():
    """Each scenario's source files declare that scenario and its first year (guards against swapped files)."""
    for scn, meta in SCENARIOS.items():
        for kind in {v["kind"] for v in VARIABLES.values()}:
            attrs = xr.open_dataset(source_path(kind, scn), drop_variables=["lat", "lon"]).attrs
            assert attrs["scenario"] == meta.get("ssp", "historical"), (scn, kind)
            assert str(attrs["start_year"]) == meta["years"][:4], (scn, kind)


def test_store_attrs_label_scenario(stores, catalog):
    for scn, ds in stores.items():
        assert ds.attrs["scenario"] == scn
        assert ds.attrs["years"] == catalog["scenarios"][scn]["years"]
        for k in ("crs", "west", "south", "east", "north"):
            assert ds.attrs[k] == stores["historical"].attrs[k], (scn, k)


def test_same_variables_shapes_and_encoding(out_dir):
    """Switching scenario never hits a missing variable or a different decoding (tech_stack.md §2.3)."""
    raws = {scn: xr.open_zarr(out_dir / f"{scn}.zarr", mask_and_scale=False) for scn in SCENARIOS}
    ref = raws["historical"]
    for scn, ds in raws.items():
        assert set(ds.data_vars) == set(VARIABLES), scn
        for var in VARIABLES:
            assert ds[var].dims == ref[var].dims and ds[var].shape == ref[var].shape, (scn, var)
            for k in ("scale_factor", "add_offset", "units", "long_name"):
                assert ds[var].attrs[k] == ref[var].attrs[k], (scn, var, k)


def test_scenarios_differ_and_warm(stores):
    """Every scenario holds its own data, and late-century SSP5-8.5 is warmer than historical."""
    t = {scn: float(ds.mean_T2.mean()) for scn, ds in stores.items()}
    assert len(set(t.values())) == len(t)
    assert t["ssp585_late"] > t["historical"] + 2
