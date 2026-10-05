import { useState } from "react";

// Shown on every page load; closing it lasts only until the next load.
export default function Disclaimer() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="disclaimer" role="note">
      <p>
        This data is preliminary and has not been published or peer-reviewed. Use only as reference and for development
        purposes.
      </p>
      <button type="button" className="disclaimer-close" aria-label="Close disclaimer" onClick={() => setOpen(false)}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  );
}
