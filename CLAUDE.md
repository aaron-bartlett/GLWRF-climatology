# CLAUDE.md

Single-page interactive map of aggregated regional climate model (WRF) data. Users select by SSP scenario, decade, variable, month/season, and similar options.

**Architecture: follow [tech_stack.md](tech_stack.md).** Vite + React on GitHub Pages, Zarr on Cloudflare R2, zarrita, MapLibre, and offline Python preprocessing. It must cost $0, with no backend. If a change conflicts with tech_stack.md, ask first. Keep tech_stack.md up to date when decisions change.

## Reminders
- **Minimize code.** Write only what the current task needs. Avoid speculative features, abstractions, config options and dependencies.
- **Be measured.** Build the simplest working version first. Add complexity (WebGL, pyramids, prefetching, state libraries) only when there's a demonstrated need.
- **Ask clarifying questions** when a decision has more than one reasonable path. Give the options, the trade-offs and a recommendation. This matters most for the data layout, `catalog.json`, URL params, and anything users see.
- Read selectable options from `catalog.json`, never hard-code them in the UI.
- Never commit credentials, NetCDF files, or generated Zarr output.

## Preprocessing and tests
- Env: `conda env create -f preprocess/environment.yml` (env name `gl-wrf`). Always run through `conda run -n gl-wrf …`, because PROJ needs the env activated.
- Build: `cd preprocess && conda run -n gl-wrf python build_stores.py` writes `preprocess/out/v1/catalog.json` and one `<scenario>.zarr` per scenario (all variables in `data/variables.md`). The variable list, labels, units and colormaps live in the `VARIABLES` dict in `build_stores.py`.
- Test: `cd preprocess && conda run -n gl-wrf pytest -q`. Run this after any preprocessing change.
- Test framework: pytest in `preprocess/tests/`. `conftest.py` builds the output once per session into a temp dir and exposes the fixtures `out_dir`, `catalog`, `store_path`, `raw` (historical, int16, undecoded), `decoded` (historical Dataset, physical values), `stores` (every scenario, decoded, keyed by scenario) and `source` (historical, native grid, display units). Add new tests as `test_<topic>.py` using these fixtures. Don't rebuild inside tests, and don't read `preprocess/out/`.

## Frontend
- Install: `npm install` (the user runs installs; ask before adding dependencies).
- Dev: `npm run dev` serves the app at http://localhost:5173 and `preprocess/out/` at `/data` (dev-only plugin in `vite.config.ts`). Build preprocessing first.
- Test: `npm test` (Vitest). Build/type-check: `npm run build`. Run both after any frontend change.
- Visual system: follow DESIGN.md (tokens live in `src/index.css` `:root`); run `.claude/skills/impeccable/scripts/impeccable detect --json src/` after UI changes. Desktop-first.
- Test convention: `src/**/<module>.test.ts` next to the module. Pure logic only (decoding, colormaps, URL state, catalog validation, projection). No network, DOM or map.

## Deployment
- Step-by-step guide: [DEPLOY.md](DEPLOY.md). Site: GitHub Pages via `.github/workflows/deploy.yml`; data: R2 via `preprocess/upload.sh`. Keep DEPLOY.md in step with any change to either.
