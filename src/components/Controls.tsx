import type { Catalog } from "../data/catalog";
import { scenarioGrid } from "../data/scenarioGrid";
import { variableGroups } from "../data/variableGroups";
import type { Selection } from "../state/urlState";

interface Props {
  catalog: Catalog;
  sel: Selection;
  onChange: (sel: Selection) => void;
  split: boolean; // side-by-side view: scenarios are picked on the maps instead
}

export default function Controls({ catalog, sel, onChange, split }: Props) {
  const variable = catalog.variables[sel.var];
  const grid = scenarioGrid(catalog);

  const scenarioCell = (key: string) => {
    const s = catalog.scenarios[key];
    const available = s.store !== null;
    return (
      <label key={key} className={`scenario${available ? "" : " is-unavailable"}`}>
        <input
          type="radio"
          name="scenario"
          value={key}
          checked={sel.scn === key}
          disabled={!available}
          onChange={() => onChange({ ...sel, scn: key })}
        />
        <span className="scenario-name">{s.ssp_label ?? s.label}</span>
        <span className="scenario-note">{available ? "" : "No data yet"}</span>
      </label>
    );
  };

  return (
    <form className="controls" onSubmit={(e) => e.preventDefault()}>
      <label className="field">
        <span className="field-label">Variable</span>
        <select value={sel.var} onChange={(e) => onChange({ ...sel, var: e.target.value })}>
          {variableGroups(catalog).map((g) => {
            const options = g.keys.map((key) => (
              <option key={key} value={key}>{catalog.variables[key].label}</option>
            ));
            return g.label ? <optgroup key={g.label} label={g.label}>{options}</optgroup> : options;
          })}
        </select>
      </label>

      {/* Variables without a month dimension keep the menu in place, disabled and blank */}
      <label className="field">
        <span className="field-label">Month</span>
        <select
          value={variable.month ? sel.m : ""}
          disabled={!variable.month}
          onChange={(e) => onChange({ ...sel, m: Number(e.target.value) })}
        >
          {!variable.month && <option value="" />}
          {catalog.months.map((name, i) => (
            <option key={name} value={i}>{name}</option>
          ))}
        </select>
      </label>

      {!split && <fieldset className="field">
        <legend className="field-label">Scenario</legend>
        <div className="scenario-grid" style={{ gridTemplateColumns: `repeat(${grid.baselines.length + grid.periods.length}, 1fr)` }}>
          {/* Baseline years sit level with the period years */}
          {grid.baselines.map((key) => (
            <span key={`b-${key}`} className="scenario-head">
              {"\u00a0"}
              <span className="scenario-head-years">{catalog.scenarios[key].years}</span>
            </span>
          ))}
          {grid.periods.map((p) => (
            <span key={p.key} className="scenario-head">
              {p.label}
              <span className="scenario-head-years">{p.years}</span>
            </span>
          ))}
          {grid.baselines.map((key) => (
            <div key={key} className="scenario-baseline" style={{ gridRow: `span ${Math.max(grid.ssps.length, 1)}` }}>
              {scenarioCell(key)}
            </div>
          ))}
          {grid.ssps.flatMap((ssp) =>
            grid.periods.map((p) => {
              const key = grid.cell(ssp.key, p.key);
              return key ? scenarioCell(key) : <span key={`${ssp.key}/${p.key}`} />;
            }),
          )}
        </div>
      </fieldset>}
    </form>
  );
}
