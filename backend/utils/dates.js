// UTC range of a "YYYY-MM" month, [monthStart, nextMonthStart).
// Fuel record dates are UTC midnight, so it holds exactly that month's records.
export function getMonthDateRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    monthStart: new Date(Date.UTC(year, monthNumber - 1, 1)),
    nextMonthStart: new Date(Date.UTC(year, monthNumber, 1))
  };
}
