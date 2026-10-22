"""catalog.json: the frontend entry point (tech_stack.md §3.2)."""

import numpy as np
import xarray as xr

import build_stores


def test_top_level_keys(catalog):
    assert set(catalog) == {"version", "dataset", "bounds", "grid", "scenarios", "months", "variables", "defaults"}
    assert catalog["version"] == build_stores.VERSION


def test_bounds_match_store(catalog, raw):
    for k in ("west", "south", "east", "north"):
        assert catalog["bounds"][k] == raw.attrs[k]


def test_grid_matches_store(catalog, raw):
    assert catalog["grid"] == {"crs": "EPSG:3857", "width": raw.sizes["x"], "height": raw.sizes["y"]}


def test_every_scenario_has_a_store(catalog, out_dir):
    root = out_dir.parent  # store paths are relative to the bucket root, above v1/
    for scn in catalog["scenarios"].values():
        assert (root / scn["store"] / ".zmetadata").exists()


def test_variables_exist_in_every_store(catalog, out_dir):
    for scn in catalog["scenarios"].values():
        if scn["store"] is None:
            continue
        ds = xr.open_zarr(out_dir.parent / scn["store"])
        for var, meta in catalog["variables"].items():
            assert var in ds
            assert ("month" in ds[var].dims) == meta["month"]


def test_months(catalog, decoded):
    assert len(catalog["months"]) == decoded.sizes["month"]


def test_variables_match_config(catalog):
    assert list(catalog["variables"]) == list(build_stores.VARIABLES)
    for var, meta in catalog["variables"].items():
        assert meta["label"] == build_stores.VARIABLES[var]["label"]
        assert meta["units"] == build_stores.VARIABLES[var]["units"]
        assert meta["group"] in {"Temperature", "Humidity and pressure", "Precipitation", "Snowfall", "Lakes"}, var


def test_groups_are_contiguous(catalog):
    """The variable menu draws one section per group, so each group's variables must be adjacent."""
    groups = [meta["group"] for meta in catalog["variables"].values()]
    seen = [g for i, g in enumerate(groups) if i == 0 or g != groups[i - 1]]
    assert len(seen) == len(set(seen))


def test_ranges_within_data_across_scenarios(catalog, stores):
    for var, meta in catalog["variables"].items():
        lo, hi = meta["range"]
        step = stores["historical"][var].encoding["scale_factor"]  # decoded extremes are within half a step
        pinned = build_stores.VARIABLES[var].get("range_min")  # e.g. snowfall amounts start at 0 by design
        assert lo == pinned or min(float(ds[var].min()) for ds in stores.values()) - step <= lo, var
        assert lo < hi, var
        assert hi <= max(float(ds[var].max()) for ds in stores.values()) + step, var


def test_defaults_valid(catalog):
    d = catalog["defaults"]
    assert d["var"] in catalog["variables"] and d["scn"] in catalog["scenarios"]
    assert 0 <= d["m"] < len(catalog["months"])


def test_scenario_grid_fields(catalog):
    """historical stands alone; the others fill an ssp × period grid (tech_stack.md §3.2)."""
    scns = catalog["scenarios"]
    assert "ssp" not in scns["historical"] and "period" not in scns["historical"]
    others = [s for k, s in scns.items() if k != "historical"]
    assert all({"ssp", "ssp_label", "period", "period_label"} <= set(s) for s in others)
    assert len({(s["ssp"], s["period"]) for s in others}) == len(others)
    assert all("store" in s for s in scns.values())


def _lightness(hex_color):
    """CIELAB L* of an sRGB hex color."""
    c = np.array([int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    y = lin @ [0.2126, 0.7152, 0.0722]
    return 116 * np.cbrt(y) - 16 if y > 0.008856 else 903.3 * y


def test_hand_built_colormaps_are_perceptually_linear(catalog):
    """The hand-built snow day-count ramp changes lightness monotonically in even steps. (The package colormaps are
    perceptually uniform by construction, the snowfall ramp is the user's choice, basin colors are categorical.)"""
    for var, meta in catalog["variables"].items():
        if meta["colormap"] == build_stores.SNOW_DAYS_COLORMAP:
            steps = np.diff([_lightness(c) for c in meta["colormap"]])
            assert np.all(steps < 0) or np.all(steps > 0), var
            assert np.ptp(steps) < 1.0, var  # equal L* spacing within 1 unit


def test_colormap_assignment(catalog):
    """batlow for temperatures (incl. dew point and lake surface), bamako for precipitation, snowfall unchanged,
    bupu for everything else (UPDATES.md)."""
    for var, meta in catalog["variables"].items():
        if var == "lake_basin":
            expected = [build_stores.BASIN_COLORS]
        elif any(k in var for k in ("_T2", "_D2", "TLAKE")):
            expected = [build_stores.BATLOW]
        elif meta["group"] == "Precipitation":
            expected = [build_stores.BAMAKO]
        elif meta["group"] == "Snowfall":
            expected = [build_stores.SNOW_COLORMAP, build_stores.SNOW_DAYS_COLORMAP]
        else:
            expected = [build_stores.BUPU]
        assert meta["colormap"] in expected, var
