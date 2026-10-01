"""Shared fixtures: build the output once per test session into a temp dir, never into preprocess/out."""

import json
import sys
from pathlib import Path

import pytest
import xarray as xr

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_stores  # noqa: E402


@pytest.fixture(scope="session")
def out_dir(tmp_path_factory):
    return build_stores.build(tmp_path_factory.mktemp("out"))


@pytest.fixture(scope="session")
def catalog(out_dir):
    return json.loads((out_dir / "catalog.json").read_text())


@pytest.fixture(scope="session")
def store_path(out_dir):
    return out_dir / "historical.zarr"


@pytest.fixture(scope="session")
def raw(store_path):
    """Store opened without CF decoding: what the browser sees (int16 + attrs)."""
    return xr.open_zarr(store_path, mask_and_scale=False)


@pytest.fixture(scope="session")
def decoded(store_path):
    """Historical store decoded to physical values (NaN where fill)."""
    return xr.open_zarr(store_path).load()


@pytest.fixture(scope="session")
def source():
    """Historical source variables on the native grid, in display units."""
    return build_stores.load_source()


@pytest.fixture(scope="session")
def stores(out_dir):
    """Every scenario's store, decoded, keyed by scenario."""
    return {scn: xr.open_zarr(out_dir / f"{scn}.zarr").load() for scn in build_stores.SCENARIOS}
