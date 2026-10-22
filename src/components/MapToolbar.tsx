import type { Variable } from "../data/catalog";
import Colorbar from "./Colorbar";
import OptionsMenu from "./OptionsMenu";

interface Props {
  variable: Variable;
  range: [number, number]; // effective colormap range
  local: boolean;
  onLocal: (v: boolean) => void;
  opacity: number; // 0–1
  onOpacity: (v: number) => void;
  labels: boolean;
  onLabels: (v: boolean) => void;
  outlines: boolean;
  onOutlines: (v: boolean) => void;
}

/** Floating bar over the map: colorbar, overlay opacity and the options menu. */
export default function MapToolbar({ variable, range, local, onLocal, opacity, onOpacity, ...options }: Props) {
  const percent = Math.round(opacity * 100);
  const categorical = !!variable.categories;
  return (
    <div className="toolbar">
      <Colorbar variable={variable} range={range} local={local && !categorical} />
      <label className="toolbar-group">
        <span className="toolbar-label">
          Opacity <output className="toolbar-value">{percent}%</output>
        </span>
        <input
          type="range"
          className="slider"
          aria-label="Opacity"
          min={0}
          max={100}
          step={5}
          value={percent}
          onChange={(e) => onOpacity(Number(e.target.value) / 100)}
        />
      </label>
      <div className="toolbar-group">
        <OptionsMenu {...options} local={local} onLocal={onLocal} localDisabled={categorical} />
      </div>
    </div>
  );
}
