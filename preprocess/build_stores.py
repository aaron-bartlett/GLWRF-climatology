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
# Sampled once from the `colormaps` package (not a build dependency), low → high.
BATLOW = ["#011959", "#08255b", "#0d315d", "#0f3b5f", "#114460", "#144c62", "#175362", "#1c5a62", "#246160", "#2d675d",
          "#386c58", "#447052", "#52744a", "#5f7843", "#6c7c3c", "#798035", "#8a842f", "#99882c", "#a98c2c", "#b98f32",
          "#ca923c", "#d89448", "#e49756", "#ef9b67", "#f8a17b", "#fca78e", "#fdada0", "#fdb3b1", "#fdbac4", "#fcbfd6",
          "#fbc6e8", "#faccfa"]  # cmaps.batlow, 32 stops
BAMAKO = ["#003b47", "#043d45", "#083f43", "#0c4240", "#10453d", "#15483a", "#1a4b37", "#204f34", "#265330", "#2d572c",
          "#345c27", "#3b6123", "#44661e", "#4c6b18", "#547113", "#5d770e", "#677d07", "#708203", "#7b8600", "#858800",
          "#918b00", "#9c8f05", "#a69611", "#b19e1f", "#bea82e", "#c9b03d", "#d3b94f", "#dcc262", "#e6cc77", "#efd58a",
          "#f7dd9c", "#ffe5ad"]  # cmaps.bamako, 32 stops
BUPU = ["#f7fcfd", "#e0ecf4", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#810f7c", "#4d004b"]  # cmaps.bupu (its 9 ColorBrewer colors)
# Lake basins: Paul Tol's "bright" qualitative set (colour-vision-deficiency safe), in `categories` order.
BASIN_COLORS = ["#4477aa", "#ee6677", "#228833", "#ccbb44", "#aa3377"]
# Snow day-counts: perceptually linear (CIELAB L* 96 → 22), lilac → indigo.
SNOW_DAYS_COLORMAP = ["#fcf0ff", "#ecd7f6", "#d9c1ed", "#c4abe4", "#ab97d9", "#9184cd",
                      "#7473c1", "#5462b4", "#2d53a5", "#00448b", "#023567"]
# Snowfall amounts, chosen by the user (not perceptually linear):
# white → light pink → dark pink → purple → dark blue → light blue, from 0 to the maximum.
SNOW_COLORMAP = ["#ffffff", "#f6c4dc", "#d9468f", "#6b2a8c", "#1d2f73", "#7cc3ea"]
GROUPS = {"monthly_mean": "Temperature", "precipitation": "Precipitation", "snowfall": "Snowfall",
          "lake_surface": "Lakes"}  # by kind; a variable's own "group" overrides it
HUMID = "Humidity and pressure"
SNOW_UNITS = "mm water equiv."
# Variables from data/variables.md, in dropdown order. `kind` picks the source file; display value = source * `mul` + `add`.
# "regrid": "nearest" keeps lake-masked fields from losing their shoreline cells; "categories" maps source strings to
# codes 1..n (anything else is fill).
VARIABLES = {
    "mean_T2": {"kind": "monthly_mean", "label": "Mean temperature (2 m)", "units": "°C", "add": -273.15,
                "long_name": "Monthly mean 2 m air temperature", "colormap": BATLOW},
    "p95_T2": {"kind": "monthly_mean", "label": "95th percentile temperature (2 m)", "units": "°C", "add": -273.15,
               "long_name": "Monthly 95th percentile 2 m air temperature", "colormap": BATLOW},
    "p99_T2": {"kind": "monthly_mean", "label": "99th percentile temperature (2 m)", "units": "°C", "add": -273.15,
               "long_name": "Monthly 99th percentile 2 m air temperature", "colormap": BATLOW},
    "mean_D2": {"kind": "monthly_mean", "label": "Mean dew point (2 m)", "units": "°C",
                "long_name": "Monthly mean 2 m dew point temperature", "colormap": BATLOW},
    "p95_D2": {"kind": "monthly_mean", "label": "95th percentile dew point (2 m)", "units": "°C",
               "long_name": "Monthly 95th percentile 2 m dew point temperature", "colormap": BATLOW},
    "p99_D2": {"kind": "monthly_mean", "label": "99th percentile dew point (2 m)", "units": "°C",
               "long_name": "Monthly 99th percentile 2 m dew point temperature", "colormap": BATLOW},
    "mean_Q2": {"kind": "monthly_mean", "group": HUMID, "label": "Mean water vapor mixing ratio (2 m)", "units": "g/kg",
                "mul": 1000, "long_name": "Monthly mean 2 m water vapor mixing ratio", "colormap": BUPU},
    "p95_Q2": {"kind": "monthly_mean", "group": HUMID, "label": "95th percentile water vapor mixing ratio (2 m)",
               "units": "g/kg", "mul": 1000, "long_name": "Monthly 95th percentile 2 m water vapor mixing ratio",
               "colormap": BUPU},
    "p99_Q2": {"kind": "monthly_mean", "group": HUMID, "label": "99th percentile water vapor mixing ratio (2 m)",
               "units": "g/kg", "mul": 1000, "long_name": "Monthly 99th percentile 2 m water vapor mixing ratio",
               "colormap": BUPU},
    "mean_SLP": {"kind": "monthly_mean", "group": HUMID, "label": "Mean sea-level pressure", "units": "hPa",
                 "long_name": "Monthly mean sea-level pressure", "colormap": BUPU},
    "p95_SLP": {"kind": "monthly_mean", "group": HUMID, "label": "95th percentile sea-level pressure", "units": "hPa",
                "long_name": "Monthly 95th percentile sea-level pressure", "colormap": BUPU},
    "p99_SLP": {"kind": "monthly_mean", "group": HUMID, "label": "99th percentile sea-level pressure", "units": "hPa",
                "long_name": "Monthly 99th percentile sea-level pressure", "colormap": BUPU},
    "mo_daily_precip": {"kind": "precipitation", "label": "Mean daily precipitation", "units": "mm/day",
                        "long_name": "Mean daily precipitation by calendar month", "colormap": BAMAKO},
    "mo_daily_precip_p95": {"kind": "precipitation", "label": "95th percentile daily precipitation",
                            "units": "mm/day", "colormap": BAMAKO,
                            "long_name": "95th percentile of daily precipitation by calendar month"},
    "mo_daily_precip_p99": {"kind": "precipitation", "label": "99th percentile daily precipitation",
                            "units": "mm/day", "colormap": BAMAKO,
                            "long_name": "99th percentile of daily precipitation by calendar month"},
    "max_precip_1day": {"kind": "precipitation", "label": "Max 1-day precipitation", "units": "mm",
                        "long_name": "Maximum 1-day precipitation over the 10-year period", "colormap": BAMAKO},
    "max_precip_5day": {"kind": "precipitation", "label": "Max 5-day precipitation", "units": "mm",
                        "long_name": "Maximum 5-day precipitation over the 10-year period", "colormap": BAMAKO},
    "max_precip_10day": {"kind": "precipitation", "label": "Max 10-day precipitation", "units": "mm",
                         "long_name": "Maximum 10-day precipitation over the 10-year period", "colormap": BAMAKO},
    "precip_days_1mm": {"kind": "precipitation", "label": "Days with precipitation ≥ 1 mm", "units": "days/year",
                        "long_name": "Mean annual number of days with precipitation ≥ 1 mm", "colormap": BAMAKO},
    "precip_days_1in": {"kind": "precipitation", "label": "Days with precipitation ≥ 1 in (25.4 mm)",
                        "units": "days/year", "colormap": BAMAKO,
                        "long_name": "Mean annual number of days with precipitation ≥ 1 inch"},
    "precip_days_2in": {"kind": "precipitation", "label": "Days with precipitation ≥ 2 in (50.8 mm)",
                        "units": "days/year", "colormap": BAMAKO,
                        "long_name": "Mean annual number of days with precipitation ≥ 2 inches"},
    "precip_days_3in": {"kind": "precipitation", "label": "Days with precipitation ≥ 3 in (76.2 mm)",
                        "units": "days/year", "colormap": BAMAKO,
                        "long_name": "Mean annual number of days with precipitation ≥ 3 inches"},
    "precip_days_4in": {"kind": "precipitation", "label": "Days with precipitation ≥ 4 in (101.6 mm)",
                        "units": "days/year", "colormap": BAMAKO,
                        "long_name": "Mean annual number of days with precipitation ≥ 4 inches"},
    "max_snowfall_1day": {"kind": "snowfall", "label": "Max 1-day snowfall", "units": SNOW_UNITS,
                          "long_name": "Maximum single-day snowfall over the 10-year period", "colormap": SNOW_COLORMAP, "range_min": 0},
    "max_snowfall_5day": {"kind": "snowfall", "label": "Max 5-day snowfall", "units": SNOW_UNITS,
                          "long_name": "Maximum 5-day snowfall over the 10-year period", "colormap": SNOW_COLORMAP, "range_min": 0},
    "max_snowfall_10day": {"kind": "snowfall", "label": "Max 10-day snowfall", "units": SNOW_UNITS,
                           "long_name": "Maximum 10-day snowfall over the 10-year period", "colormap": SNOW_COLORMAP, "range_min": 0},
    "yr_tot_snowfall": {"kind": "snowfall", "label": "Annual total snowfall", "units": "mm/year water equiv.",
                        "long_name": "Mean annual total snowfall", "colormap": SNOW_COLORMAP, "range_min": 0},
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
    "winter_daily_snowfall_p99": {"kind": "snowfall", "label": "99th percentile daily winter snowfall (Nov–Apr)",
                                  "units": "mm/day water equiv.", "colormap": SNOW_COLORMAP, "range_min": 0,
                                  "long_name": "99th percentile of daily snowfall in winter (November–April)"},
    "TLAKE_sfc_mean": {"kind": "lake_surface", "regrid": "nearest", "label": "Mean lake surface temperature",
                       "units": "°C", "add": -273.15, "colormap": BATLOW,
                       "long_name": "Monthly mean lake surface (top layer) temperature"},
    "TLAKE_sfc_p95": {"kind": "lake_surface", "regrid": "nearest", "label": "95th percentile lake surface temperature",
                      "units": "°C", "add": -273.15, "colormap": BATLOW,
                      "long_name": "Monthly 95th percentile lake surface (top layer) temperature"},
    "TLAKE_sfc_p99": {"kind": "lake_surface", "regrid": "nearest", "label": "99th percentile lake surface temperature",
                      "units": "°C", "add": -273.15, "colormap": BATLOW,
                      "long_name": "Monthly 99th percentile lake surface (top layer) temperature"},
    "ICEFRAC_mean": {"kind": "lake_surface", "regrid": "nearest", "label": "Mean lake ice cover", "units": "%",
                     "mul": 100, "colormap": BUPU, "range_min": 0, "long_name": "Monthly mean lake surface ice fraction"},
    "lake_ice_days": {"kind": "lake_surface", "regrid": "nearest", "label": "Lake ice days (ice cover ≥ 50%)",
                      "units": "days/year", "colormap": BUPU,
                      "long_name": "Mean annual number of days with lake ice fraction ≥ 0.5"},
    "lake_basin": {"kind": "lake_surface", "regrid": "nearest", "label": "Great Lakes drainage basin", "units": "",
                   "long_name": "Great Lakes basin each grid point drains to",
                   "categories": {"SUPERIOR": "Lake Superior", "MICHIGAN": "Lake Michigan", "HURON": "Lake Huron",
                                  "ERIE": "Lake Erie", "ONTARIO": "Lake Ontario"},
                   "colormap": BASIN_COLORS},
}
DATASET = (f"GL-WRF regional simulation · {145 - 2 * BORDER}×{174 - 2 * BORDER} cropped grid"
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
        if "stat" in ds.dims:  # lake_surface: a size-1 dim on its 2D fields
            ds = ds.squeeze("stat", drop=True)
        for name, meta in VARIABLES.items():
            if meta["kind"] == kind:
                da = ds[name].reset_coords(drop=True)
                if "categories" in meta:  # strings → codes 1..n, anything else NaN
                    codes = np.full(da.shape, np.nan)
                    for code, key in enumerate(meta["categories"], 1):
                        codes[da.values == key] = code
                    da = da.copy(data=codes)
                da = da.astype("float64").load() * meta.get("mul", 1) + meta.get("add", 0)
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
    bilinear = xe.Regridder(ds, dst, "bilinear", unmapped_to_nan=True)
    nearest = [v for v in ds.data_vars if VARIABLES[v].get("regrid") == "nearest"]
    out = bilinear(ds.drop_vars(nearest), keep_attrs=False)
    if nearest:
        # nearest-neighbour extrapolates past the native domain: keep only where bilinear covers it
        inside = bilinear(xr.DataArray(np.ones(ds.lat.shape), dims=ds.lat.dims)).notnull()
        near = xe.Regridder(ds, dst, "nearest_s2d")(ds[nearest], keep_attrs=False)
        out = out.merge(near.where(inside.values))
    out = out.drop_vars(["lat", "lon"]).assign_coords(x=xs, y=ys, month=np.arange(1, 13))
    west, north = to_lonlat.transform(xs[0] - res / 2, ys[0] + res / 2)
    east, south = to_lonlat.transform(xs[-1] + res / 2, ys[-1] - res / 2)
    bounds = {"west": west, "south": south, "east": east, "north": north}
    return out, bounds


def encoding_for(das, meta):
    """int16 with scale/offset spanning the range across all scenarios (tech_stack §2.3 step 4).
    Category codes are stored as-is."""
    lo = min(float(da.min()) for da in das)
    hi = max(float(da.max()) for da in das)
    scale, offset = (1, 0) if "categories" in meta else ((hi - lo) / 65000, (hi + lo) / 2)  # headroom below FILL
    da = das[0]
    return {
        "dtype": "int16",
        "scale_factor": scale,
        "add_offset": offset,
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


def category_centers(src, name, meta):
    """[lon, lat] label position per category: the mean of its native (cropped) grid cells in `src`."""
    return [[round(float(src.lon.values[src[name].values == code].mean()), 3),
             round(float(src.lat.values[src[name].values == code].mean()), 3)]
            for code in range(1, len(meta["categories"]) + 1)]


def catalog_entry(name, meta, das, src):
    entry = {"label": meta["label"], "group": meta.get("group", GROUPS[meta["kind"]]), "units": meta["units"],
             "colormap": meta["colormap"], "month": "month" in das[0].dims}
    if "categories" in meta:
        return {**entry, "range": [1, len(meta["categories"])], "categories": list(meta["categories"].values()),
                "centers": category_centers(src, name, meta)}
    return {**entry, "range": display_range(das, meta.get("range_min"))}


def build(out_dir):
    out_dir = Path(out_dir) / VERSION
    stores, sources = {}, {}
    for scn in SCENARIOS:
        sources[scn] = load_source(scn)
        stores[scn], bounds = regrid(sources[scn])  # same native grid in every file, so same bounds
    fields = {v: [ds[v] for ds in stores.values()] for v in VARIABLES}
    encoding = {v: encoding_for(das, VARIABLES[v]) for v, das in fields.items()}
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
        "variables": {v: catalog_entry(v, meta, fields[v], sources["historical"]) for v, meta in VARIABLES.items()},
        "defaults": {"var": "mean_T2", "scn": "historical", "m": 0},
    }
    (out_dir / "catalog.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False))
    return out_dir


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default=ROOT / "out")
    print("wrote", build(p.parse_args().out))
