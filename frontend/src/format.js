// Display helpers used by several pages.

// 25055.5 → "25,055.5"
export const formatNumber = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

// 25055.5 → "Rs 25,055.5"
export const formatRupees = (amount) => `Rs ${formatNumber(amount)}`;

// "2026-10" → "October 2026"
export function formatMonthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}
