"use client";

export default function FilterPill({ label, active = false, open = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: "0",
        color: "#757575",
        fontSize: "16px",
        fontWeight: 400,
        letterSpacing: "0",
        textTransform: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px"
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: "12px", opacity: 0.9 }}>▾</span>
    </button>
  );
}
