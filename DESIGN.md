---
name: GL-WRF Climatology Explorer
description: Every view is a publishable figure; the map is a framed plate and the selection is its live caption.
colors:
  lake-navy-ink: "#15283f"
  slate-ink: "#4b5e74"
  muted-slate-ink: "#6c7d90"
  blue-grey-rule: "#c5ced8"
  hover-tint: "#e6ebf0"
  plate-ground: "#f3f5f7"
  cell-surface: "#fafbfc"
typography:
  headline:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.005em"
  body-large:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.45
    fontFeature: "tnum"
  figure-annotation:
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  hairline: "2px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
components:
  panel:
    backgroundColor: "{colors.plate-ground}"
    textColor: "{colors.lake-navy-ink}"
    padding: "24px 24px 32px"
    width: "340px"
  map-toolbar:
    backgroundColor: "{colors.plate-ground}"
    rounded: "{rounded.hairline}"
    padding: "10px 16px 8px"
  select:
    backgroundColor: "{colors.cell-surface}"
    textColor: "{colors.lake-navy-ink}"
    typography: "{typography.body-large}"
    rounded: "{rounded.hairline}"
    padding: "0 32px 0 10px"
    height: "36px"
  toggle:
    backgroundColor: "{colors.cell-surface}"
    textColor: "{colors.lake-navy-ink}"
    rounded: "{rounded.hairline}"
    padding: "0 10px"
    height: "30px"
  toggle-hover:
    backgroundColor: "{colors.hover-tint}"
  toggle-pressed:
    backgroundColor: "{colors.lake-navy-ink}"
    textColor: "{colors.cell-surface}"
  scenario-cell:
    backgroundColor: "{colors.cell-surface}"
    textColor: "{colors.lake-navy-ink}"
    rounded: "{rounded.hairline}"
    padding: "6px 8px"
    height: "48px"
  scenario-cell-hover:
    backgroundColor: "{colors.hover-tint}"
  scenario-cell-live:
    backgroundColor: "{colors.lake-navy-ink}"
    textColor: "{colors.cell-surface}"
  scenario-cell-unavailable:
    textColor: "{colors.muted-slate-ink}"
  hover-readout:
    backgroundColor: "{colors.plate-ground}"
    textColor: "{colors.lake-navy-ink}"
    rounded: "{rounded.hairline}"
    padding: "5px 8px"
---

# Design System: GL-WRF Climatology Explorer

## Overview

**Creative North Star: "The Journal Figure Plate"**

Every view is a figure a researcher could drop into a paper. The data domain is a framed figure panel with a degree tick collar; the selection reads as its caption; the colorbar is a calibrated scale with ruled ticks and units. The interface borrows its manners from print: one grotesque, tabular numerals, hairline rules, flat plates, navy ink on cool off-white. It is professional but not strictly academic: precise and quiet, without the austerity of a methods appendix.

The interface never competes with the data. It owns no colour that could be read as a data value: everything outside the overlay is lake-navy ink, slate ink and blue-grey tints on off-white. State is shown by form, never by hue. The panel is dense and desktop-first, built for a researcher at a monitor flipping variable, month and scenario one at a time and watching the figure and caption update in place.

The world rejects the generic data-portal sidebar of stock form controls on white, the dark "command centre" map, and decorative chrome.

**Key Characteristics:**
- Lake-navy ink in place of black, off-white grounds in place of white, blue-grey tints in place of neutral greys.
- A single Helvetica-stack grotesque with tabular numerals throughout.
- Division by 1px hairline rules and flat bordered plates; no shadows anywhere.
- State by form: inverted navy cell = live, struck-through + "No data yet" = unavailable, dashed domain frame = loading.
- The map is a figure: thin navy frame, 5° tick collar with bold labels drawn straight on the basemap, calibrated colorbar.

## Colors

A cool, near-monochrome ink-and-paper palette tinted toward lake blue, so that every saturated colour on screen belongs to the data.

### Primary
- **Lake Navy Ink** (lake-navy-ink): the system's black. Body text, the nameplate rule, the domain frame and tick collar, colorbar outline and ticks, focus rings, the readout border, and the fill of every live/pressed state (inverted cell). Also the native `accent-color`, so the opacity slider renders in navy.

### Neutral
- **Slate Ink** (slate-ink): secondary text: field and toolbar labels, units, dataset line, period years, readout coordinates, attribution. Also the hover border on cells and selects. 6.1:1 on the plate ground.
- **Muted Slate Ink** (muted-slate-ink): reserved for unavailable (disabled) scenario text only. 3.9:1 on the plate ground, acceptable only because it marks inactive controls; never use it for live content.
- **Blue-Grey Rule** (blue-grey-rule): every hairline: panel divider, controls top rule, cell, select, toggle and toolbar borders, scrollbar thumb. Doubles as the secondary text colour inside a live navy cell.
- **Hover Tint** (hover-tint): hover fill for cells and the toggle.
- **Plate Ground** (plate-ground): panel, floating toolbar, hover readout and the map attribution: every surface that sits on or beside the figure.
- **Cell Surface** (cell-surface): the slightly lighter fill of interactive cells (selects, toggle, scenario cells), and the text colour on inverted navy.

### Named Rules
**The No Data-Colour Rule.** The interface uses no colour that could be confused with the data colormap. Chrome is navy, slate and blue-grey on off-white only; no reds, greens, ambers or saturated blues for status, emphasis or links.

**The Ink-Not-Black Rule.** Lake navy replaces black, off-white replaces white, blue-grey tints replace neutral greys. No `#000`, no `#fff`, no neutral grey in the UI.

**The Catalog Owns the Ramp Rule.** Data colormaps are not design tokens. Each variable's colormap comes from `catalog.json` as a d3 scheme name (optionally `_r`) or a list of hex stops; stop lists must be perceptually linear (equal CIELAB L* steps). Snowfall, precipitation, temperature and dewpoint each get a distinct ramp; the temperature ramp runs light blue → violet → dark red. Ranges are fixed per variable across scenarios.

## Typography

**Body Font:** Helvetica Neue (with Helvetica, Arial, sans-serif)

**Character:** One figure-convention grotesque, the face of journal plates and axis labels, set with tabular numerals everywhere so values, ticks and coordinates align. Hierarchy comes from size and weight, never from a second family.

### Hierarchy
- **Headline** (700, 22px, 1.2, -0.015em): the caption title, variable name with its units in regular slate.
- **Title** (700, 15px, -0.005em): the nameplate, ruled underneath in navy.
- **Body Large** (400, 15px, 1.45): caption detail line (month · scenario, years) and select values.
- **Body** (400, 14px, 1.45): base text; scenario names and readout values take it at 700.
- **Label** (700, 12px, slate): field labels ("Variable", "Month", "Scenario") and toolbar labels, sentence case. 12px regular also sets colorbar ticks, the dataset line and period headings.
- **Figure Annotation** (400, 11px): readout coordinates, map attribution. Tick collar degrees use 700 for legibility over the basemap.

### Named Rules
**The Units Always Rule.** No value, title, colorbar or readout appears without its units; units sit in slate beside the value they qualify.

**The True Minus Rule.** Negative numbers use the typographic minus (−), never a hyphen.

## Layout

A two-column figure layout: a fixed 340px panel on the left (plate ground, 24px sides, 28px between nameplate, caption and controls, scrolling independently) and the map filling the rest. A floating toolbar is centred along the top of the map, 16px down, carrying the colorbar (280px), the opacity slider (160px) and the "Map labels" toggle, 24px apart. The data domain is fitted into the open map area below the toolbar (24px gap) and right of the panel, with room left for the collar margins and attribution.

Spacing runs on a 4px base (4, 8, 12, 16, 20, 24, 28); 6px and 10px appear only inside small controls. Desktop-first: below 720px the panel stacks above a 70vh map and the toolbar wraps; mobile is not otherwise designed for.

**The Centred Figure Rule.** The domain is centred in the open map area, never under the toolbar or the panel.

## Elevation & Depth

Completely flat. There are no shadows anywhere, including the floating toolbar, the hover readout and the map attribution. Layers separate by a 1px border and an opaque plate-ground fill, as a print figure's inset would.

**The Flat Plate Rule.** Anything that floats over the map is a flat off-white plate with a 1px hairline (blue-grey for chrome, navy for the readout). Never a shadow, blur or translucent glass.

## Shapes

Rectilinear. A barely softened 2px corner on every bordered control and plate; the domain frame, colorbar ramp and tick marks are square and crisp-edged. Borders are always 1px. Dashed strokes are a state signal reserved for the loading domain frame (4 4 dash). The colorbar's extension caps are outlined triangles, navy outline with the end colour inset, continuous with the ramp's outline.

## Components

### Buttons (toggle)
Quiet and squared; the only button is the "Map labels" toggle.
- **Shape:** 2px corner, 30px tall, 1px blue-grey border, cell-surface fill, 13px text.
- **Hover:** hover-tint fill, 150ms on the shared ease (cubic-bezier(0.22, 1, 0.36, 1)).
- **Pressed:** inverted navy, the same "live" form as a selected scenario cell. When off, all basemap labels are hidden.

### Inputs / Fields
- **Select:** 36px, 2px corner, 1px blue-grey border, cell-surface fill, 15px value, a navy chevron drawn inline. Hover darkens the border to slate.
- **Opacity slider:** native range input in navy (via `accent-color`), 0–100% in 5% steps, default 80%, live percentage shown beside its label.
- **Focus:** 2px solid navy outline at 2px offset on every focusable element, including scenario cells via their hidden radio.

### Scenario Matrix (signature)
The scenario selector is a fixed matrix: Historical spans both rows on the left; period columns (midcentury, latecentury, with years) head an SSP × period grid. Cells are 48px minimum, 1px blue-grey, 2px corner, cell-surface fill, bold name with a 12px slate note.
- **Hover:** hover-tint fill, slate border.
- **Live:** inverted navy cell with off-white name; the note turns blue-grey.
- **Unavailable:** stays visible, transparent fill, name in muted slate struck through with a 1px line, note reads "No data yet", cursor not-allowed, no hover response, solid border.

### Caption (signature)
The figure caption: headline (variable + units), a detail line (month · scenario, years), and the dataset line in 12px slate. The dataset line is also the error slot; errors replace it in place.

### Colorbar (signature)
A calibrated scale: a 12px ramp outlined in navy, outlined triangular extension caps when values exceed the range, 5px navy ruled ticks at round values plus both range ends, and units to the right in slate.

### Domain Frame (signature)
A 1px crisp navy rectangle around the data domain with outward 5px ticks every 5°, 11px degree labels, and opaque plate-ground margin bands (46px left, 24px bottom) so basemap labels end at one clean edge. Dashed while a field is loading. The overlay sits beneath the basemap labels and renders nearest-neighbour cells.

### Hover Readout
A flat plate-ground tag offset 14px from the cursor, 1px navy border, bold value with units, coordinates in 11px slate; reads "No data" where empty.

## Do's and Don'ts

### Do:
- **Do** use lake navy for all ink, rules of emphasis and live states; slate for secondary text; blue-grey for hairlines.
- **Do** show state by form: inverted navy for live, strike-through plus "No data yet" for unavailable, dashed domain frame for loading.
- **Do** keep unavailable scenarios visible in the matrix.
- **Do** set every number in tabular figures with a true minus, and attach units to every value.
- **Do** keep floating elements as flat off-white plates with a 1px border and a 2px corner.
- **Do** take every data colormap and range from `catalog.json`, perceptually linear.
- **Do** keep basemap labels above the data, cells nearest-neighbour, and the overlay opacity user-set (default 80%).

### Don't:
- **Don't** introduce any interface colour that could be mistaken for a data value, including for errors, links or status.
- **Don't** use black, pure white or neutral grey.
- **Don't** use shadows, blurs or translucent panels anywhere, floating elements included.
- **Don't** use dashed borders for anything but the loading frame; in particular, unavailable cells keep a solid border.
- **Don't** add a second typeface or proportional numerals.
- **Don't** smooth or interpolate the data cells.
- **Don't** build a dark "command centre" theme or decorative chrome.
