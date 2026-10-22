import { useEffect, useRef, useState } from "react";

interface Props {
  labels: boolean;
  onLabels: (v: boolean) => void;
  outlines: boolean;
  onOutlines: (v: boolean) => void;
  local: boolean;
  onLocal: (v: boolean) => void;
  localDisabled: boolean; // categorical variables have no range to rescale
}

const check = (
  <svg className="menu-check" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 6.5 5 9.5 10 3" />
  </svg>
);

/** "Options" dropdown: map labels and lake outlines (checkboxes), global or local colormap (radios). */
export default function OptionsMenu({ labels, onLabels, outlines, onOutlines, local, onLocal, localDisabled }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const item = (role: "menuitemcheckbox" | "menuitemradio", label: string, checked: boolean, onClick: () => void, disabled = false) => (
    <button type="button" role={role} className="menu-item" aria-checked={checked} disabled={disabled} onClick={onClick}>
      {checked ? check : <span className="menu-check" />}
      {label}
    </button>
  );
  const pick = (v: boolean) => () => {
    onLocal(v);
    setOpen(false);
  };

  return (
    <div className="options" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="toggle options-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Options"
        onClick={() => setOpen(!open)}
      >
        <span className="options-text">Options</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="Options">
          {item("menuitemcheckbox", "Map labels", labels, () => onLabels(!labels))}
          {item("menuitemcheckbox", "Lake outlines", outlines, () => onOutlines(!outlines))}
          <div className="menu-separator" role="separator" />
          {item("menuitemradio", "Global colormap", !local || localDisabled, pick(false), localDisabled)}
          {item("menuitemradio", "Local colormap", local && !localDisabled, pick(true), localDisabled)}
        </div>
      )}
    </div>
  );
}
