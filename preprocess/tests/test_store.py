"""Store structure and encoding: the contract in tech_stack.md §3.1."""

import json

import numpy as np

from build_stores import FILL, VARIABLES


def test_consolidated_zarr_v2(store_path):
    meta = json.loads((store_path / ".zmetadata").read_text())
    assert meta["zarr_consolidated_format"] == 1
    for var in VARIABLES:
        assert f"{var}/.zarray" in meta["metadata"]


def test_only_listed_variables(raw):
    assert set(raw.data_vars) == set(VARIABLES)


def test_array_layout(raw):
    """Monthly variables are (month, y, x), one chunk per month; the rest are a single (y, x) chunk."""
    for var in VARIABLES:
        da = raw[var]
        assert da.dtype == np.int16, var
        if "month" in da.dims:
            assert da.dims == ("month", "y", "x") and da.sizes["month"] == 12, var
            assert da.encoding["chunks"] == (1, da.sizes["y"], da.sizes["x"]), var
        else:
            assert da.dims == ("y", "x"), var
            assert da.encoding["chunks"] == (da.sizes["y"], da.sizes["x"]), var


def test_chunk_files(store_path, raw):
    for var in VARIABLES:
        chunks = sorted(p.name for p in (store_path / var).iterdir() if not p.name.startswith("."))
        expected = [f"{m}.0.0" for m in range(12)] if "month" in raw[var].dims else ["0.0"]
        assert chunks == sorted(expected), var


def test_zstd_compressor(store_path):
    for var in VARIABLES:
        zarray = json.loads((store_path / var / ".zarray").read_text())
        assert zarray["compressor"]["id"] == "zstd"
        assert zarray["fill_value"] == FILL


def test_cf_attrs(raw):
    for var, meta in VARIABLES.items():
        attrs = raw[var].attrs
        for key in ("scale_factor", "add_offset", "units", "long_name"):
            assert key in attrs, var
        assert attrs["units"] == meta["units"] and attrs["long_name"] == meta["long_name"]


def test_no_valid_value_collides_with_fill(raw):
    for var in VARIABLES:
        data = raw[var].values
        valid = data[data != FILL]
        assert valid.min() > FILL, var
