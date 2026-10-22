# Variables

This maps each displayed variable to its source NetCDF file and variable name. Each file exists once per scenario (see the file table in tech_stack.md §2.3). The value ranges listed are the observed min–max across the whole grid. Ranges are for the historical files. Apart from the lake-surface fields (NaN over land), no historical variable contains NaNs (see "Data anomalies" for the others).

## Source files
| Key | File | Dimensions | Coordinates |
|---|---|---|---|
| `snow` | `stats_snowfall_historical_2005-2015.nc` | `lat`=145, `lon`=174, `doy`=365 | 2D `lat`, `lon` |
| `precip` | `stats_precipitation_historical_2005-2015.nc` | `lat`=145, `lon`=174, `month`=12, `season`=4, `day`=3652 | 2D `lat`, `lon` |
| `monthly` | `stats_monthly_mean_historical_2005-2015.nc` | `south_north`=145, `west_east`=174, `month`=12 | 2D `XLAT`, `XLONG` |
| `lake` | `stats_lake_surface_historical_2005-2015.nc` | `month`=12, `south_north`=145, `west_east`=174, `stat`=1 | 2D `XLAT`, `XLONG` |

## Snowfall
| Label | File | Variable | Dims | Units | Range |
|---|---|---|---|---|---|
| Max snowfall, 1 day | `snow` | `max_snowfall_1day` | lat, lon | mm | 0–75.2 |
| Max snowfall, 5 day | `snow` | `max_snowfall_5day` | lat, lon | mm | 9.8–122.3 |
| Max snowfall, 10 day | `snow` | `max_snowfall_10day` | lat, lon | mm | 0–126.8 |
| Annual total snowfall | `snow` | `yr_tot_snowfall` | lat, lon | mm (per year) | 11.9–368.6 |
| Snow cover days | `snow` | `snow_cover_days` | lat, lon | days/year | 0–365.2 |
| Days per year with snowfall ≥ 1 cm | `snow` | `yr_days_snowfall_1cm` | lat, lon | days/year | 0–108 |
| Winter daily snowfall, mean | `snow` | `winter_daily_snowfall` | lat, lon | mm/day | 0–2.15 |
| Winter daily snowfall, p95 | `snow` | `winter_daily_snowfall_p95` | lat, lon | mm/day | 0–11.25 |
| Winter daily snowfall, p99 | `snow` | `winter_daily_snowfall_p99` | lat, lon | mm/day | 1.9–24.4 |

"Winter" means November–April.

## Precipitation
| Label | File | Variable | Dims | Units | Range |
|---|---|---|---|---|---|
| Monthly daily precipitation, mean | `precip` | `mo_daily_precip` | lat, lon, month | mm/day | 0–11.24 |
| Monthly daily precipitation, p95 | `precip` | `mo_daily_precip_p95` | lat, lon, month | mm/day | 0–44.49 |
| Monthly daily precipitation, p99 | `precip` | `mo_daily_precip_p99` | lat, lon, month | mm/day | 3.0–100.4 |
| Max precipitation, 1 day | `precip` | `max_precip_1day` | lat, lon | mm | 37.9–350.0 |
| Max precipitation, 5 day | `precip` | `max_precip_5day` | lat, lon | mm | 63.2–428.3 |
| Max precipitation, 10 day | `precip` | `max_precip_10day` | lat, lon | mm | 77.1–491.7 |
| Precipitation days per year ≥ 1 mm | `precip` | `precip_days_1mm` | lat, lon | days/year | 3.9–193.5 |
| Precipitation days per year ≥ 1 in | `precip` | `precip_days_1in` | lat, lon | days/year | 0.9–18.4 |
| Precipitation days per year ≥ 2 in | `precip` | `precip_days_2in` | lat, lon | days/year | 0–3.5 |
| Precipitation days per year ≥ 3 in | `precip` | `precip_days_3in` | lat, lon | days/year | 0–1.3 |
| Precipitation days per year ≥ 4 in | `precip` | `precip_days_4in` | lat, lon | days/year | 0–0.6 |

## Monthly means
| Label | File | Variable | Dims | Units (stored → display) | Range (stored) |
|---|---|---|---|---|---|
| Mean T2 | `monthly` | `mean_T2` | south_north, west_east, month | K → °C (subtract 273.15) | 250.3–301.8 K |
| P95 T2 | `monthly` | `p95_T2` | south_north, west_east, month | K → °C (subtract 273.15) | 266.2–309.5 K |
| Mean D2 | `monthly` | `mean_D2` | south_north, west_east, month | °C (no conversion) | −31.4–20.6 |
| P99 T2 | `monthly` | `p99_T2` | south_north, west_east, month | K → °C (subtract 273.15) | 271.4–311.6 K |
| P95 D2 | `monthly` | `p95_D2` | south_north, west_east, month | °C (no conversion) | −10.8–25.6 |
| P99 D2 | `monthly` | `p99_D2` | south_north, west_east, month | °C (no conversion) | −4.3–25.5 |

## Humidity and pressure
| Label | File | Variable | Dims | Units (stored → display) | Range (stored) |
|---|---|---|---|---|---|
| Mean Q2 (mixing ratio) | `monthly` | `mean_Q2` | south_north, west_east, month | kg/kg → g/kg (× 1000) | 0.00074–0.0137 |
| P95 Q2 | `monthly` | `p95_Q2` | south_north, west_east, month | kg/kg → g/kg (× 1000) | 0.0021–0.0185 |
| P99 Q2 | `monthly` | `p99_Q2` | south_north, west_east, month | kg/kg → g/kg (× 1000) | 0.0032–0.0201 |
| Mean SLP | `monthly` | `mean_SLP` | south_north, west_east, month | hPa (no conversion) | 1010–1020 |
| P95 SLP | `monthly` | `p95_SLP` | south_north, west_east, month | hPa (no conversion) | 1017–1035 |
| P99 SLP | `monthly` | `p99_SLP` | south_north, west_east, month | hPa (no conversion) | 1018–1043 |

## Lake surface
| Label | File | Variable | Dims | Units (stored → display) | Range (stored) |
|---|---|---|---|---|---|
| Mean lake surface temperature | `lake` | `TLAKE_sfc_mean` | month, south_north, west_east | K → °C (subtract 273.15) | 251.6–297.3 K |
| P95 lake surface temperature | `lake` | `TLAKE_sfc_p95` | month, south_north, west_east | K → °C | 264.6–300.7 K |
| P99 lake surface temperature | `lake` | `TLAKE_sfc_p99` | month, south_north, west_east | K → °C | 267.5–302.6 K |
| Mean lake ice cover | `lake` | `ICEFRAC_mean` | month, south_north, west_east | fraction → % (× 100) | 0–1 |
| Lake ice days (ice ≥ 50%) | `lake` | `lake_ice_days` | stat, south_north, west_east | days → days/year (mean per year, no conversion) | 7.8–256.5 |
| Great Lakes drainage basin | `lake` | `lake_basin` | stat, south_north, west_east | string → codes 1–5 | `SUPERIOR`, `MICHIGAN`, `HURON`, `ERIE`, `ONTARIO`, `NONE` |

Lake fields are NaN over land (about 11% of native cells are lake). `lake_basin` is the drainage basin each grid point drains to, so it covers land too (7,662 of 25,230 native cells).

The `month` coordinate runs 1–12 in both the `monthly` and `precip` files.

## Notes for preprocessing
- **All four files share the same 145×174 native WRF grid.** `XLAT`/`XLONG` in `monthly` (and `lake`) are identical to `lat`/`lon` in the other files. The grid is curvilinear (2D lat/lon), so it must be regridded per tech_stack.md. Preprocessing crops 7 cells from every edge (the lateral boundary zone) first, leaving 131×160.
- **xarray can't open `snow` or `precip` as-is**, because the 2D `lat`/`lon` variables share names with their dimensions. Use `xr.open_dataset(f, drop_variables=["lat", "lon"])` and take the coordinates from `monthly`, or read them with `netCDF4`.
- **Dimension names and order differ between files.** In `monthly` the dims are `(south_north, west_east, month)` and in `precip` `(lat, lon, month)`. In both, month is the last dimension. Rename the dims to a common name and transpose so month comes first before chunking.
- **The `monthly` file has no units attributes.** T2 is in Kelvin and D2 is in °C (confirmed by the data producer).
- **Snowfall units are "mm" and the threshold is "1cm".** They are liquid-water equivalent (confirmed by the data producer), so the site labels them "mm water equiv.".
- **The `lake` file has `month` first** (the others have it last) and a size-1 `stat` dim on its 2D fields, which preprocessing squeezes out. Its `XLAT`/`XLONG` match `monthly` (checked by `tests/test_lakes.py`).
- **`lake_basin` is a string variable.** Preprocessing stores it as int16 codes 1–5 (Superior, Michigan, Huron, Erie, Ontario; `NONE` becomes fill) with scale 1 and offset 0. The catalog carries the names, one color each, and a label position per basin (the mean lon/lat of its native cells).
- **Lake fields are regridded nearest-neighbour**, masked to the native domain. Bilinear would turn every lake cell next to land into NaN.
- **All five scenarios exist**, and every file (including `monthly`) has `scenario`, `start_year` and `end_year` attributes. `preprocess/tests/test_scenarios.py` checks them against the scenario keys.

## Data anomalies (report to the data producer)
These are built as-is. NaN cells show as "no data", and display ranges (2nd–98th percentile) ignore the outliers.
- **`snow_cover_days` is NaN in a rectangular block** (rows 0–72, cols 0–86, ~6,350 cells, about 38–45°N, 94–84°W) in **ssp245 2085–2094** and **ssp585 2045–2054** only. This looks like a missing processing tile.
- **`snow_cover_days` reaches 365.2 days/year** in a few historical cells (99.9th percentile is 161). In the future scenarios the maximum is 134–175.
- **`yr_days_snowfall_1cm` spikes to 168–242 days/year** at the NE domain edge in all future scenarios (historical max 108, 99th percentile ~100–120). This is likely a lateral-boundary artifact.
- **`TLAKE_sfc_mean` reaches 251.6 K (−21.6 °C)** in historical, and about 27% of valid lake cell-months are below 0 °C. Under ice cover the top layer seems to follow the ice or snow temperature.
- **"Winter" is Nov–Mar** for `winter_daily_snowfall*` in the producer's documentation, but the site labels say Nov–Apr. Unresolved; the labels are unchanged.
- **Precipitation has a heavy tail in ssp585 2085–2094.** `max_precip_1day`/`5day`/`10day` reach 767/1,017/1,130 mm there. `mo_daily_precip` reaches 57 mm/day (historical max 11) and `mo_daily_precip_p95` reaches 273 mm/day, with maxima on the domain edge. There are 2,145 cell-months above 20 mm/day, compared with none in historical.
