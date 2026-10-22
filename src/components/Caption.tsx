import type { Catalog } from "../data/catalog";
import type { Selection } from "../state/urlState";

/** Figure caption for the current selection; doubles as the error slot. */
export default function Caption({ catalog, sel, error }: { catalog: Catalog; sel: Selection; error: string | null }) {
  const v = catalog.variables[sel.var];
  const scenario = (key: string) => `${catalog.scenarios[key].label}, ${catalog.scenarios[key].years}`;
  return (
    <div className="caption" aria-live="polite">
      <h2 className="caption-title">
        {v.label}
        {v.units && <span className="caption-units">({v.units})</span>}
      </h2>
      <p className="caption-detail">
        {v.month && <>{catalog.months[sel.m]} · </>}
        {sel.scn2 ? (
          <>
            Left: {scenario(sel.scn)}
            <br />
            Right: {scenario(sel.scn2)}
          </>
        ) : (
          scenario(sel.scn)
        )}
      </p>
      {error ? <p className="caption-error" role="alert">{error}</p> : <p className="caption-dataset">{catalog.dataset}</p>}
    </div>
  );
}
