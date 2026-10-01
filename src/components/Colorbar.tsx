import type { CSSProperties } from "react";
import { cssGradient, interpolator } from "../map/colormap";
import { niceTicks } from "../map/ticks";
import type { Variable } from "../data/catalog";

/** Calibrated scale: ramp with pointed caps (values beyond the range are drawn in the end colors),
 *  ruled ticks at round values plus both range ends, and the units. */
export default function Colorbar({ variable }: { variable: Variable }) {
  const [lo, hi] = variable.range;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const color = interpolator(variable.colormap);
  const near = (a: number, b: number) => Math.abs(a - b) < (hi - lo) * 0.08;
  const nice = niceTicks(lo, hi);
  const ticks = [lo, ...nice.filter((v) => !near(v, lo) && !near(v, hi)), hi];
  return (
    <figure className="colorbar" aria-label={`Color scale from ${lo} to ${hi} ${variable.units}; values beyond either end use the end colors`}>
      <div className="colorbar-bar">
        <span className="colorbar-cap is-low" style={{ "--cap": color(0) } as CSSProperties} title={`≤ ${lo} ${variable.units}`} />
        <div className="colorbar-ramp" style={{ background: cssGradient(variable.colormap) }} />
        <span className="colorbar-cap is-high" style={{ "--cap": color(1) } as CSSProperties} title={`≥ ${hi} ${variable.units}`} />
      </div>
      <div className="colorbar-scale">
        {ticks.map((v) => (
          <span key={v} className="colorbar-tick" style={{ left: pos(v) }}>
            {v < 0 ? `−${-v}` : v}
          </span>
        ))}
      </div>
      <figcaption className="colorbar-units">{variable.units}</figcaption>
    </figure>
  );
}
