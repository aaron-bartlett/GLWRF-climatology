"""Grid geometry: Web Mercator, north-up, bounds consistent with the native domain."""

import numpy as np

import build_stores
from build_stores import to_merc


def test_regular_mercator_spacing(decoded):
    dx = np.diff(decoded.x.values)
    dy = np.diff(decoded.y.values)
    assert np.allclose(dx, dx[0]) and dx[0] > 0
    assert np.allclose(dy, -dx[0])  # square cells, y descending


def test_north_up(decoded):
    """Row 0 is north: in January the northern third is colder than the southern third."""
    jan = decoded.mean_T2.isel(month=0).values
    n = jan.shape[0] // 3
    assert np.nanmean(jan[:n]) < np.nanmean(jan[-n:])


def test_bounds_are_cell_edges(decoded, raw):
    b = raw.attrs
    res = float(decoded.x[1] - decoded.x[0])
    (w, e), (n, s) = to_merc.transform([b["west"], b["east"]], [b["north"], b["south"]])
    assert np.isclose(w, decoded.x[0] - res / 2) and np.isclose(e, decoded.x[-1] + res / 2)
    assert np.isclose(n, decoded.y[0] + res / 2) and np.isclose(s, decoded.y[-1] - res / 2)


def test_bounds_cover_native_domain(raw, source):
    b = raw.attrs
    assert b["west"] <= float(source.lon.min()) and b["east"] >= float(source.lon.max())
    assert b["south"] <= float(source.lat.min()) and b["north"] >= float(source.lat.max())


def test_corners_are_fill_center_is_not(decoded):
    jan = decoded.mean_T2.isel(month=0).values
    ny, nx = jan.shape
    assert not np.isnan(jan[ny // 2, nx // 2])
    assert np.isnan(jan[0, 0]) or np.isnan(jan[-1, -1]) or np.isnan(jan[0, -1]) or np.isnan(jan[-1, 0])
