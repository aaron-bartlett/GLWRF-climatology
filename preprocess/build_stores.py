"""Build the Zarr stores (one per scenario) and catalog.json the frontend reads.

Builds every variable in data/variables.md for all five scenarios. See tech_stack.md §2–3.

Usage: python build_stores.py [--out OUT_DIR]   (default: preprocess/out)
"""

import argparse
import json
from pathlib import Path

import numcodecs
import numpy as np
import xarray as xr
import xesmf as xe
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / "data"
VERSION = "v1"
SCENARIOS = {
    "historical": {"label": "Historical", "years": "2005–2014"},
    "ssp245_mid": {"label": "SSP2-4.5 mid-century", "ssp": "ssp245", "ssp_label": "SSP2-4.5",
                   "period": "midcentury", "period_label": "Mid-century", "years": "2045–2054"},
    "ssp245_late": {"label": "SSP2-4.5 late-century", "ssp": "ssp245", "ssp_label": "SSP2-4.5",
                    "period": "latecentury", "period_label": "Late-century", "years": "2085–2094"},
    "ssp585_mid": {"label": "SSP5-8.5 mid-century", "ssp": "ssp585", "ssp_label": "SSP5-8.5",
                   "period": "midcentury", "period_label": "Mid-century", "years": "2045–2054"},
    "ssp585_late": {"label": "SSP5-8.5 late-century", "ssp": "ssp585", "ssp_label": "SSP5-8.5",
                    "period": "latecentury", "period_label": "Late-century", "years": "2085–2094"},
}
# Source file suffix per scenario: data/stats_{kind}_{suffix}.nc
SOURCE_SUFFIX = {"historical": "historical_2005-2015", "ssp245_mid": "ssp245_2045-2055",
                 "ssp245_late": "ssp245_2085-2095", "ssp585_mid": "ssp585_2045-2055",
                 "ssp585_late": "ssp585_2085-2095"}
FILL = -32768
BORDER = 7  # native cells cropped from each edge: the WRF lateral boundary zone holds erroneous values
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]
# Perceptually linear temperature ramp, light blue (cold) to dark red (hot): CIELAB L* falls linearly
# 93 → 22 while hue turns 230° → 35° through violet; chroma reduced only where needed to stay in sRGB.
TEMP_COLORMAP = ["#cdf1fe", "#a9deff", "#9fc7f2", "#9cafe0", "#9b97cb", "#9d7eb6",
                 "#a2629c", "#a5437b", "#9c2654", "#86162f", "#6c0e0d"]
# Same construction (L* linear 96 → 22, gamut-clipped chroma), one hue path per family so they never look alike:
DEW_COLORMAP = ["#f7f3c2", "#dbe1a5", "#bdd18b", "#9dc074", "#7eaf66", "#629d5e",      # straw → green → teal
                "#468b55", "#29794d", "#076746", "#02543f", "#024136"]
PRECIP_COLORMAP = ["#d6fcee", "#b4e9dd", "#90d7cf", "#68c4c4", "#40b0ba", "#019cb0",   # mint → teal → navy
                   "#06879f", "#08728e", "#055e7c", "#024a6a", "#013857"]
SNOW_DAYS_COLORMAP = ["#fcf0ff", "#ecd7f6", "#d9c1ed", "#c4abe4", "#ab97d9", "#9184cd",  # lilac → indigo
                      "#7473c1", "#5462b4", "#2d53a5", "#00448b", "#023567"]
# Snowfall amounts, chosen by the user (not perceptually linear):
# white → light pink → dark pink → purple → dark blue → light blue, from 0 to the maximum.
SNOW_COLORMAP = ["#ffffff", "#f6c4dc", "#d9468f", "#6b2a8c", "#1d2f73", "#7cc3ea"]
GROUPS = {"monthly_mean": "Temperature", "precipitation": "Precipitation", "snowfall": "Snowfall"}  # by kind
SNOW_UNITS = "mm water equiv."
# Variables from data/variables.md, in dropdown order. `kind` picks the source file; `add` converts to display units.
VARIABLES = {
    "mean_T2": {"kind": "monthly_mean", "label": "Mean temperature (2 m)", "units": "°C", "add": -273.15,
                "long_name": "Monthly mean 2 m air temperature", "colormap": TEMP_COLORMAP},
    "p95_T2": {"kind": "monthly_mean", "label": "95th percentile temperature (2 m)", "units": "°C", "add": -273.15,
               "long_name": "Monthly 95th percentile 2 m air temperature", "colormap": TEMP_COLORMAP},
    "mean_D2": {"kind": "monthly_mean", "label": "Mean dew point (2 m)", "units": "°C",
                "long_name": "Monthly mean 2 m dew point temperature", "colormap": DEW_COLORMAP},
    "p95_D2": {"kind": "monthly_mean", "label": "95th percentile dew point (2 m)", "units": "°C",
               "long_name": "Monthly 95th percentile 2 m dew point temperature", "colormap": DEW_COLORMAP},
    "mo_daily_precip": {"kind": "precipitation", "label": "Mean daily precipitation", "units": "mm/day",
                        "long_name": "Mean daily precipitation by calendar month", "colormap": PRECIP_COLORMAP},
    "mo_daily_precip_p95": {"kind": "precipitation", "label": "95th percentile daily precipitation",
                            "units": "mm/day", "colormap": PRECIP_COLORMAP,
                            "long_name": "95th percentile of daily precipitation by calendar month"},
    "precip_days_1mm": {"kind": "precipitation", "label": "Days with precipitation ≥ 1 mm", "units": "days/year",
                        "long_name": "Mean annual number of days with precipitation ≥ 1 mm", "colormap": PRECIP_COLORMAP},
    "max_snowfall_1day": {"kind": "snowfall", "label": "Max 1-day snowfall", "units": SNOW_UNITS,
                          "long_name": "Maximum single-day snowfall over the 10-year period", "colormap": SNOW_COLORMAP, "range_min": 0},
    "max_snowfall_10day": {"kind": "snowfall", "label": "Max 10-day snowfall", "units": SNOW_UNITS,
                           "long_name": "Maximum 10-day snowfall over the 10-year period", "colormap": SNOW_COLORMAP, "range_min": 0},
    "yr_days_snowfall_1cm": {"kind": "snowfall", "label": "Days with snowfall ≥ 1 cm", "units": "days/year",
                             "long_name": "Mean annual number of days with snowfall ≥ 1 cm", "colormap": SNOW_DAYS_COLORMAP},
    "snow_cover_days": {"kind": "snowfall", "label": "Snow cover days", "units": "days/year",
                        "long_name": "Mean annual number of days with snow cover", "colormap": SNOW_DAYS_COLORMAP},
    "winter_daily_snowfall": {"kind": "snowfall", "label": "Mean daily winter snowfall (Nov–Apr)",
                              "units": "mm/day water equiv.", "colormap": SNOW_COLORMAP, "range_min": 0,
                              "long_name": "Mean daily snowfall in winter (November–April)"},
    "winter_daily_snowfall_p95": {"kind": "snowfall", "label": "95th percentile daily winter snowfall (Nov–Apr)",
                                  "units": "mm/day water equiv.", "colormap": SNOW_COLORMAP, "range_min": 0,
                                  "long_name": "95th percentile of daily snowfall in winter (November–April)"},
}
DATASET = (f"GL-WRF regional simulation · {145 - 2 * BORDER}×{174 - 2 * BORDER} native grid (edges cropped)"
           " · 10-year climatologies")

to_merc = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
to_lonlat = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)


def source_path(kind, scn):
    return DATA / f"stats_{kind}_{SOURCE_SUFFIX[scn]}.nc"


def load_source(scn="historical"):
    """Native-grid Dataset of all VARIABLES in display units, dims ([month,] south_north, west_east), 2D lat/lon,
    with BORDER cells cropped from every edge."""
    geo = xr.open_dataset(source_path("monthly_mean", scn))
    out = {}
    for kind in {v["kind"] for v in VARIABLES.values()}:
        # snowfall/precipitation have 2D lat/lon variables named like their dims, which xarray can't open
        ds = xr.open_dataset(source_path(kind, scn), drop_variables=["lat", "lon"])
        ds = ds.rename_dims({d: n for d, n in {"lat": "south_north", "lon": "west_east"}.items() if d in ds.dims})
        for name, meta in VARIABLES.items():
            if meta["kind"] == kind:
                da = ds[name].reset_coords(drop=True).astype("float64").load() + meta.get("add", 0)
                out[name] = da.transpose(..., "south_north", "west_east")
    ds = xr.Dataset(out).drop_vars(["south_north", "west_east"], errors="ignore")
    ds = ds.assign_coords(lat=(("south_north", "west_east"), geo.XLAT.values),
                          lon=(("south_north", "west_east"), geo.XLONG.values))
    crop = slice(BORDER, -BORDER or None)
    return ds.isel(south_north=crop, west_east=crop)


def target_grid(lat, lon):
    """Regular EPSG:3857 grid covering the native domain, at the native spacing. Rows run north to south."""
    x, y = to_merc.transform(lon, lat)
    res = float(np.median(np.diff(x, axis=1)))
    xs = np.arange(x.min(), x.max() + res, res)
    ys = np.arange(y.max(), y.min() - res, -res)
    lon2d, lat2d = to_lonlat.transform(*np.meshgrid(xs, ys))
    return xs, ys, res, lat2d, lon2d


def regrid(ds):
    """Bilinear regrid to the Web Mercator grid. Cells outside the native domain (or next to NaN) become NaN."""
    xs, ys, res, lat2d, lon2d = target_grid(ds.lat.values, ds.lon.values)
    dst = xr.Dataset(coords={"lat": (("y", "x"), lat2d), "lon": (("y", "x"), lon2d)})
    out = xe.Regridder(ds, dst, "bilinear", unmapped_to_nan=True)(ds, keep_attrs=False)
    out = out.drop_vars(["lat", "lon"]).assign_coords(x=xs, y=ys, month=np.arange(1, 13))
    west, north = to_lonlat.transform(xs[0] - res / 2, ys[0] + res / 2)
    east, south = to_lonlat.transform(xs[-1] + res / 2, ys[-1] - res / 2)
    bounds = {"west": west, "south": south, "east": east, "north": north}
    return out, bounds


def encoding_for(das):
    """int16 with scale/offset spanning the range across all scenarios (tech_stack §2.3 step 4)."""
    lo = min(float(da.min()) for da in das)
    hi = max(float(da.max()) for da in das)
    scale = (hi - lo) / 65000  # leaves headroom below FILL
    da = das[0]
    return {
        "dtype": "int16",
        "scale_factor": scale,
        "add_offset": (hi + lo) / 2,
        "_FillValue": FILL,
        "chunks": (1, da.sizes["y"], da.sizes["x"]) if "month" in da.dims else (da.sizes["y"], da.sizes["x"]),
        "compressors": (numcodecs.Zstd(level=5),),
    }


def display_range(das, lo=None):
    """2nd–98th percentile across all scenarios (and months), rounded outward to 2 significant digits.
    `lo` pins the lower end (e.g. 0 for snowfall amounts)."""
    p2, hi = np.nanpercentile(np.concatenate([da.values.ravel() for da in das]), [2, 98])
    lo = p2 if lo is None else lo
    step = 10.0 ** (np.floor(np.log10(hi - lo)) - 1)
    return [round(float(np.floor(lo / step) * step), 6), round(float(np.ceil(hi / step) * step), 6)]


def build(out_dir):
    out_dir = Path(out_dir) / VERSION
    stores = {}
    for scn in SCENARIOS:
        stores[scn], bounds = regrid(load_source(scn))  # same native grid in every file, so same bounds
    fields = {v: [ds[v] for ds in stores.values()] for v in VARIABLES}
    encoding = {v: encoding_for(das) for v, das in fields.items()}
    for scn, ds in stores.items():
        for v, meta in VARIABLES.items():
            ds[v].attrs = {"units": meta["units"], "long_name": meta["long_name"]}
        ds.attrs = {"crs": "EPSG:3857", **bounds, "scenario": scn, "years": SCENARIOS[scn]["years"]}
        ds.to_zarr(out_dir / f"{scn}.zarr", mode="w", zarr_format=2, consolidated=True, encoding=encoding)

    da = stores["historical"]["mean_T2"]
    catalog = {
        "version": VERSION,
        "dataset": DATASET,
        "bounds": bounds,
        "grid": {"crs": "EPSG:3857", "width": da.sizes["x"], "height": da.sizes["y"]},
        "scenarios": {k: {**v, "store": f"{VERSION}/{k}.zarr"} for k, v in SCENARIOS.items()},
        "months": MONTHS,
        "variables": {v: {"label": meta["label"], "group": GROUPS[meta["kind"]], "units": meta["units"],
                          "colormap": meta["colormap"], "range": display_range(fields[v], meta.get("range_min")),
                          "month": "month" in fields[v][0].dims}
                      for v, meta in VARIABLES.items()},
        "defaults": {"var": "mean_T2", "scn": "historical", "m": 0},
    }
    (out_dir / "catalog.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False))
    return out_dir


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default=ROOT / "out")
    print("wrote", build(p.parse_args().out))
