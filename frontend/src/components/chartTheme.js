// Shared Recharts styles. Colours are theme CSS variables, so charts follow light/dark mode.

export const AXIS_TICK = { fill: "var(--text-muted)", fontSize: 10 };

export const GRID_COLOR = "var(--border)";

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--surface-2)",
    border: "1px solid var(--border-hover)",
    borderRadius: 10,
    fontSize: 11,
  },
  labelStyle: { color: "var(--text)", fontWeight: 700 },
  itemStyle: { color: "var(--text-soft)" },
  cursor: { fill: "var(--fill)" },
};
