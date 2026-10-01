import type { Variable } from "../data/catalog";
import Colorbar from "./Colorbar";

interface Props {
  variable: Variable;
  opacity: number; // 0–1
  onOpacity: (v: number) => void;
  labels: boolean;
  onLabels: (v: boolean) => void;
}

/** Floating bar over the map: colorbar, overlay opacity and map-label toggle. */
export default function MapToolbar({ variable, opacity, onOpacity, labels, onLabels }: Props) {
  const percent = Math.round(opacity * 100);
  return (
    <div className="toolbar">
      <Colorbar variable={variable} />
      <label className="toolbar-group">
        <span className="toolbar-label">
          Opacity <output className="toolbar-value">{percent}%</output>
        </span>
        <input
          type="range"
          className="slider"
          min={0}
          max={100}
          step={5}
          value={percent}
          onChange={(e) => onOpacity(Number(e.target.value) / 100)}
        />
      </label>
      <div className="toolbar-group">
        <button type="button" className="toggle" aria-pressed={labels} onClick={() => onLabels(!labels)}>
          Map labels
        </button>
      </div>
    </div>
  );
}
