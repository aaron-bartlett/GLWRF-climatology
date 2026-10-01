import type { Catalog } from "../data/catalog";
import type { Selection } from "../state/urlState";

/** Figure caption for the current selection; doubles as the error slot. */
export default function Caption({ catalog, sel, error }: { catalog: Catalog; sel: Selection; error: string | null }) {
  const v = catalog.variables[sel.var];
  const s = catalog.scenarios[sel.scn];
  return (
    <div className="caption" aria-live="polite">
      <h2 className="caption-title">
        {v.label} <span className="caption-units">({v.units})</span>
      </h2>
      <p className="caption-detail">
        {v.month && <>{catalog.months[sel.m]} · </>}
        {s.label}, {s.years}
      </p>
      {error ? <p className="caption-error" role="alert">{error}</p> : <p className="caption-dataset">{catalog.dataset}</p>}
    </div>
  );
}
