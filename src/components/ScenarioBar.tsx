import type { Catalog } from "../data/catalog";

/** Five flat scenario buttons along the bottom of a map in the side-by-side view. */
export default function ScenarioBar({ catalog, value, onChange, label }: {
  catalog: Catalog;
  value: string;
  onChange: (scn: string) => void;
  label: string;
}) {
  return (
    <div className="scenario-bar" role="radiogroup" aria-label={label}>
      {Object.entries(catalog.scenarios).map(([key, s]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          className={`scenario${s.store ? "" : " is-unavailable"}`}
          disabled={!s.store}
          onClick={() => onChange(key)}
        >
          <span className="scenario-name">{s.ssp_label ?? s.label}</span>
          <span className="scenario-note">{s.period_label ?? s.years}</span>
        </button>
      ))}
    </div>
  );
}
