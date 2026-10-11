// Avoids float noise like 600.5999999999999 in rupee and litre totals.
export const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;
