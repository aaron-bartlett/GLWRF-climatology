---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/components/Controls.tsx","src/components/MapToolbar.tsx","src/map/MapView.tsx"]
---

# Surface brief: Explorer (single page)

Mode: Operate. Researchers at a desk monitor, daytime, flipping variable × month × scenario to inspect and compare one field at a time. Success: reach a field fast, trust placement and units, and the view reads like a citable figure.

Constraints: options come from catalog.json only; overlay opacity is a 0–100% slider (default 80%), a "Map labels" toggle hides every basemap label, labels sit above data and nearest-neighbour cells are approved and fixed; the domain is centred in the open area right of the panel. Anti-goals: dark "command centre", decorative chrome, any UI colour that could be mistaken for data. Professional but not strictly academic.

Unresolved: none for this build. Hover readout and view hash come later (Milestone 5).

## Direction contract

THESIS: Every view is a publishable figure: the domain is a framed figure panel, the selection is its live caption. Refuses the generic data-portal sidebar of stock form controls on white.

OWN-WORLD: Cool off-white grounds (#F3F5F7 panel, #FAFBFC cells), deep lake-navy ink (#15283F) instead of black, slate secondary ink (#4B5E74), blue-grey hairline rules (#C5CED8). One figure-convention grotesque (Helvetica/Arial stack), tabular numerals. Division by hairline rules, never cards or shadows. The colormap for temperature is a perceptually linear light-blue → dark-red stop list from the catalog. State by form: live = inverted navy cell, unavailable = struck with "no data yet", loading = dashed frame.

STORY: The researcher reads the caption to know exactly what is shown, changes one selector, and sees the field and caption update in place; scenarios without data stay visible as cancelled cells.

FIRST VIEWPORT: Left: a 340px off-white column with the name plate, the caption (title line plus dataset line), then Variable, Month and the scenario matrix (Historical spanning both rows, period columns, SSP rows). Right: the map; a floating off-white toolbar centred along its top carries the colorbar as a calibrated scale with ruled ticks and units, the opacity slider and the "Map labels" toggle; below it the domain sits inside a thin navy frame with a degree tick collar every 5°.

FORM: Journal Figure Plate, the model's own top-ranked grounded candidate (picked over the roll), seed b9ca363c.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
