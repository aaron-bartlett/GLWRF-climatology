# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Decided by the user and recorded in [tech_stack.md](tech_stack.md): Vite + React + TypeScript on GitHub Pages, Zarr on Cloudflare R2 read with zarrita, MapLibre via react-map-gl, and offline Python preprocessing. It costs $0 and has no backend. tech_stack.md is the authority, and any conflict with it needs the user's approval.

## Users

Climate and Great Lakes researchers. They are comfortable with WRF, SSP scenarios, and percentile statistics such as p95 and p99. They open the map to inspect and compare aggregated regional climate model output across variables, months, and scenarios.

## Product Purpose

GL-WRF Climatology Explorer is a single-page interactive map of aggregated statistics from a Great Lakes regional WRF simulation. Three selectors determine the image shown: a variable, a month (only for variables that have a month dimension), and one of five scenarios. It succeeds when a researcher can reach a specific field quickly, trust what they see (correct units, placement, and colorbar), and share the exact selection as a link.

## Positioning

It serves this specific GL-WRF downscaled dataset directly in the browser. That means a 145×174 native grid over the Great Lakes, historical 2005–2014 plus SSP2-4.5 and SSP5-8.5 for 2045–2054 and 2085–2094, and snowfall, precipitation, and surface-meteorology statistics. No downloading, no software, and no server.

## Operating Context

- Usually used on a desktop by researchers who are exploring, cross-checking, or preparing figures and discussion. The URL holds the full selection, so a link can be shared with a colleague.
- Selectable options come from `catalog.json`, which preprocessing generates from the variable list in `data/variables.md`. The UI never hard-codes variables, months, or scenarios.
- Source data are postprocessed NetCDF statistics files in `data/`. Filenames say `2005-2015` and so on, but the global attributes give 10-year spans (2005–2014, 2045–2054, 2085–2094).

## Capabilities and Constraints

**Selectors (required).** These three choices determine the image displayed:
1. **Variable.** The variables listed in `data/variables.md` (snowfall, precipitation, and monthly means).
2. **Month.** A dropdown (January–December) that appears only when the selected variable has a `month` dimension. Variables without one, such as the snowfall statistics and `precip_days_1mm`, hide it.
3. **Scenario.** One of five: historical (2005–2014), ssp245 midcentury (2045–2054), ssp245 latecentury (2085–2094), ssp585 midcentury, and ssp585 latecentury. The user fixed this layout: historical sits to the left of a 2×2 grid, with columns for midcentury and latecentury and rows for ssp245 (top) and ssp585 (bottom).

   ```
                  midcentury      latecentury
   historical  │  ssp245       │  ssp245
               │  ssp585       │  ssp585
   ```

**Also required:** a colormapped data overlay on a basemap, a colorbar with units, and a shareable URL (query params hold the selection).

**Bonus features (after the selectors work):** panning, zooming (with the map view stored in the URL hash), and a hover readout of the value and units at a point ("no data" where empty).

**Out of scope**
- Data download. The user explicitly set it aside.
- Any backend, server, database, or paid service.

**Open decisions (not yet confirmed)**
- Whether snowfall "mm" and the "1 cm" threshold are liquid-water equivalent or snow depth.
	- Answer: snowfall in mm is liquid-equivalent, 1cm threshold is snow depth
- D2 units. They appear to be °C already, but the monthly file has no units attributes.
	- Answer: D2 is already in deg C. leave as is
- Whether to add scenario comparison (difference or side-by-side). It was not selected as a must-have.
	-Answer: This can be left out. Switching between viewing scenarios is enough
- Colormap and range conventions per variable, and any land or lake mask (tech_stack.md §11).
	- Answer: Create min/max ranges for each variable which remain constant between different scenarios. No land/lake mask is necessary for the data. All colormaps should be perceptively linear but different colormaps should be used for snowfall, precipitation, temperature, and dewpoint

## Brand Commitments

- Name: **GL-WRF Climatology Explorer**.
- It is a standalone project with no parent-institution branding or logo.
- Its audience is researchers, so it uses standard scientific terminology (SSP2-4.5, p95, 2 m temperature) rather than simplified public-facing language.

## Evidence on Hand

- The dataset is NetCDF statistics in `data/`: snowfall, precipitation, and monthly means for historical, ssp245, and ssp585 (2045–2055 and 2085–2095 files). The archive is `data/glwrf_website_xfer.tar.gz`.
- Variable mapping and preprocessing notes are in `data/variables.md`.
- Missing, and not to be fabricated: logo, citation or DOI, model description or methods text, author or institution credits, and validation results.

## Product Principles

1. **Values must be trustworthy.** Correct units, accurate geographic placement, stable colorbars, and an honest "no data" all come before visual flourish.
2. **Units always.** No value, colorbar, or readout appears without its units.
3. **Every view can be shared.** Any selection a researcher reaches can be reproduced from its URL.
4. **The data defines the interface.** Controls come from `catalog.json`, so adding a variable or scenario requires no UI change.
5. **Keep it small.** Build only what the current task needs, and add complexity only when there is a demonstrated need.
