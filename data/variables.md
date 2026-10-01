# Variables

This maps each displayed variable to its source NetCDF file and variable name. Each file exists once per scenario (see the file table in tech_stack.md §2.3). The value ranges listed are the observed min–max across the whole grid. Ranges are for the historical files. No historical variable contains NaNs (see "Data anomalies" for the others).

## Source files
| Key | File | Dimensions | Coordinates |
|---|---|---|---|
| `snow` | `stats_snowfall_historical_2005-2015.nc` | `lat`=145, `lon`=174, `doy`=365 | 2D `lat`, `lon` |
| `precip` | `stats_precipitation_historical_2005-2015.nc` | `lat`=145, `lon`=174, `month`=12, `season`=4, `day`=3652 | 2D `lat`, `lon` |
| `monthly` | `stats_monthly_mean_historical_2005-2015.nc` | `south_north`=145, `west_east`=174, `month`=12 | 2D `XLAT`, `XLONG` |

## Snowfall
| Label | File | Variable | Dims | Units | Range |
|---|---|---|---|---|---|
| Max snowfall, 1 day | `snow` | `max_snowfall_1day` | lat, lon | mm | 0–75.2 |
| Max snowfall, 10 day | `snow` | `max_snowfall_10day` | lat, lon | mm | 0–126.8 |
| Snow cover days | `snow` | `snow_cover_days` | lat, lon | days/year | 0–365.2 |
| Days per year with snowfall ≥ 1 cm | `snow` | `yr_days_snowfall_1cm` | lat, lon | days/year | 0–108 |
| Winter daily snowfall, mean | `snow` | `winter_daily_snowfall` | lat, lon | mm/day | 0–2.15 |
| Winter daily snowfall, p95 | `snow` | `winter_daily_snowfall_p95` | lat, lon | mm/day | 0–11.25 |

"Winter" means November–April.

## Precipitation
| Label | File | Variable | Dims | Units | Range |
|---|---|---|---|---|---|
| Monthly daily precipitation, mean | `precip` | `mo_daily_precip` | lat, lon, month | mm/day | 0–11.24 |
| Monthly daily precipitation, p95 | `precip` | `mo_daily_precip_p95` | lat, lon, month | mm/day | 0–44.49 |
| Precipitation days per year ≥ 1 mm | `precip` | `precip_days_1mm` | lat, lon | days/year | 3.9–193.5 |

## Monthly means
| Label | File | Variable | Dims | Units (stored → display) | Range (stored) |
|---|---|---|---|---|---|
| Mean T2 | `monthly` | `mean_T2` | south_north, west_east, month | K → °C (subtract 273.15) | 250.3–301.8 K |
| P95 T2 | `monthly` | `p95_T2` | south_north, west_east, month | K → °C (subtract 273.15) | 266.2–309.5 K |
| Mean D2 | `monthly` | `mean_D2` | south_north, west_east, month | °C (no conversion) | −31.4–20.6 |
| P95 D2 | `monthly` | `p95_D2` | south_north, west_east, month | °C (no conversion) | −10.8–25.6 |

The `month` coordinate runs 1–12 in both the `monthly` and `precip` files.

## Notes for preprocessing
- **All three files share the same 145×174 native WRF grid.** `XLAT`/`XLONG` in `monthly` are identical to `lat`/`lon` in the other two files. The grid is curvilinear (2D lat/lon), so it must be regridded per tech_stack.md. Preprocessing crops 7 cells from every edge (the lateral boundary zone) first, leaving 131×160.
- **xarray can't open `snow` or `precip` as-is**, because the 2D `lat`/`lon` variables share names with their dimensions. Use `xr.open_dataset(f, drop_variables=["lat", "lon"])` and take the coordinates from `monthly`, or read them with `netCDF4`.
- **Dimension names and order differ between files.** In `monthly` the dims are `(south_north, west_east, month)` and in `precip` `(lat, lon, month)`. In both, month is the last dimension. Rename the dims to a common name and transpose so month comes first before chunking.
- **The `monthly` file has no units attributes.** T2 is in Kelvin and D2 is in °C (confirmed by the data producer).
- **Snowfall units are "mm" and the threshold is "1cm".** They are liquid-water equivalent (confirmed by the data producer), so the site labels them "mm water equiv.".
- **All five scenarios exist**, and every file (including `monthly`) has `scenario`, `start_year` and `end_year` attributes. `preprocess/tests/test_scenarios.py` checks them against the scenario keys.

## Data anomalies (report to the data producer)
These are built as-is. NaN cells show as "no data", and display ranges (2nd–98th percentile) ignore the outliers.
- **`snow_cover_days` is NaN in a rectangular block** (rows 0–72, cols 0–86, ~6,350 cells, about 38–45°N, 94–84°W) in **ssp245 2085–2094** and **ssp585 2045–2054** only. This looks like a missing processing tile.
- **`snow_cover_days` reaches 365.2 days/year** in a few historical cells (99.9th percentile is 161). In the future scenarios the maximum is 134–175.
- **`yr_days_snowfall_1cm` spikes to 168–242 days/year** at the NE domain edge in all future scenarios (historical max 108, 99th percentile ~100–120). This is likely a lateral-boundary artifact.
- **Precipitation has a heavy tail in ssp585 2085–2094.** `mo_daily_precip` reaches 57 mm/day (historical max 11) and `mo_daily_precip_p95` reaches 273 mm/day, with maxima on the domain edge. There are 2,145 cell-months above 20 mm/day, compared with none in historical.
