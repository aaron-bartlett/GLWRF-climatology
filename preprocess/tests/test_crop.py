"""The WRF lateral boundary zone is cropped before regridding."""

import build_stores


def test_source_edges_cropped(source):
    assert source.sizes["south_north"] == 145 - 2 * build_stores.BORDER
    assert source.sizes["west_east"] == 174 - 2 * build_stores.BORDER
