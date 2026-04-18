"use client";

import { useEffect, useRef, useState } from "react";
import FilterPill from "@/app/components/ui/FilterPill";

const FILTER_KEYS = [
  "main_category", "stitch_type", "tier",
  "color", "fabric", "occasion", "piece_count", "in_stock",
];

const KEY_LABELS = {
  main_category: "Main Category",
  stitch_type:   "Stitch Type",
  tier:          "Tier",
  color:         "Color",
  fabric:        "Fabric",
  occasion:      "Occasion",
  piece_count:   "Piece Count",
  in_stock:      "Stock Status",
};

const ALL_LABELS = {
  main_category: "All Categories",
  stitch_type:   "All Stitch Types",
  tier:          "All Tiers",
  color:         "All Colors",
  fabric:        "All Fabrics",
  occasion:      "All Occasions",
  piece_count:   "All Piece Counts",
  in_stock:      "All Stock Statuses",
};

function formatValue(key, value) {
  if (key === "in_stock") {
    if (value === true  || value === "true")  return "In Stock";
    if (value === false || value === "false") return "Out of Stock";
    return String(value);
  }
  if (key === "piece_count") {
    const n = Number(value);
    if (n === 1) return "1 Piece";
    if (n > 1)   return `${n} Pieces`;
    return String(value);
  }
  if (!value && value !== 0) return "";
  return String(value)
    .replace(/[-_]/g, " ")
    .split(" ")
    .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : "")
    .join(" ");
}

export default function FilterBar({ filtersData, selectedFilters, onChange, onClearAll }) {
  const [openKey, setOpenKey] = useState(null);
  const rootRef = useRef(null);
  const hasActive = FILTER_KEYS.some(k => Boolean(selectedFilters[k]));

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!rootRef.current?.contains(e.target)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={rootRef}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "center" }}>
        {FILTER_KEYS.map((key) => {
          const selected = selectedFilters[key] || "";
          const options  = filtersData[key] || [];
          const isOpen   = openKey === key;
          const pillLabel = selected ? formatValue(key, selected) : KEY_LABELS[key];

          return (
            <div key={key} style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <FilterPill
                label={pillLabel}
                active={Boolean(selected)}
                open={isOpen}
                onClick={() => setOpenKey(isOpen ? null : key)}
              />

              {isOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    left: 0,
                    minWidth: "180px",
                    background: "#fff",
                    border: "2px solid #dfdfdf",
                    borderRadius: "0",
                    boxShadow: "none",
                    padding: "6px 0",
                    zIndex: 30,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { onChange(key, ""); setOpenKey(null); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: "transparent", border: "none",
                      padding: "10px 16px", cursor: "pointer",
                      fontSize: "16px", color: "#757575",
                    }}
                  >
                    {ALL_LABELS[key]}
                  </button>

                  {options.map((value) => {
                    const rawStr   = String(value);
                    const isSelected = selected === rawStr;
                    return (
                      <button
                        key={rawStr}
                        type="button"
                        onClick={() => { onChange(key, rawStr); setOpenKey(null); }}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          background: isSelected ? "#f2f2f2" : "transparent",
                          border: "none", padding: "10px 16px",
                          cursor: "pointer", fontSize: "16px", color: "#757575",
                        }}
                      >
                        {formatValue(key, value)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {hasActive && onClearAll && (
          <button
            type="button"
            onClick={() => { onClearAll(); setOpenKey(null); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "12px", color: "#757575", letterSpacing: ".06em",
              textTransform: "uppercase", padding: "0",
            }}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
