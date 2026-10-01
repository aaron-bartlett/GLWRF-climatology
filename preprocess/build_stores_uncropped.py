"""Build the same Zarr stores and catalog.json as build_stores.py, but without cropping the WRF lateral
boundary zone. Archive only: the website does not use this output (the edge cells hold erroneous values).

Usage: python build_stores_uncropped.py [--out OUT_DIR]   (default: preprocess/out_uncropped)
"""

import argparse

import build_stores as bs

bs.BORDER = 0
bs.DATASET = "GL-WRF regional simulation · 145×174 native grid (uncropped) · 10-year climatologies"

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default=bs.ROOT / "out_uncropped")
    print("wrote", bs.build(p.parse_args().out))
