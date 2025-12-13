"use client";

import { useRef } from "react";

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
  ariaLabelButton?: string;
};

export function DateField({
  label,
  value,
  onChange,
  inline,
  ariaLabelButton,
}: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;

    const anyEl = el as any;
    try {
      if (typeof anyEl.showPicker === "function") {
        anyEl.showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  }

  const wrapperClasses = [
    "file-field",
    inline ? "file-field--inline" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label className="form-label">{label}</label>
      <div className={wrapperClasses}>
        <div className="file-field-wrapper">
          <div className="file-field-label">
            <input
              ref={inputRef}
              type="date"
              className="date-input-field"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <button
              type="button"
              className="file-field-button"
              onClick={openPicker}
              aria-label={ariaLabelButton ?? label}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


