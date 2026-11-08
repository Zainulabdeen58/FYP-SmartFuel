// The "YYYY-MM" month of a stored day (UTC midnight of that day).
export const monthOfDay = (date) => date.toISOString().slice(0, 7);

// UTC range of a "YYYY-MM" month, [monthStart, nextMonthStart).
// Fuel record dates are UTC midnight, so it holds exactly that month's records.
export function getMonthDateRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    monthStart: new Date(Date.UTC(year, monthNumber - 1, 1)),
    nextMonthStart: new Date(Date.UTC(year, monthNumber, 1))
  };
}
