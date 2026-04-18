"use client";

export default function Select({ value, onChange, options = [], placeholder = "Select" }) {
  return (
    <select
      value={value || ""}
      onChange={onChange}
      style={{
        padding: "9px 12px",
        border: "2px solid #dfdfdf",
        fontSize: "12px",
        letterSpacing: "0.06em",
        backgroundColor: "#ffffff",
        color: "#000000",
        cursor: "pointer",
        minHeight: "40px",
        fontFamily: "'Jost','DM Sans',sans-serif",
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
