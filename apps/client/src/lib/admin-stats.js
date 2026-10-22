function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Fills the gaps in a sparse per-day series so every day of the period has
// a bar, including the days without any activity.
export function fillDays(rows, days, pick) {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1) + index);
    const row = byDay.get(dayKey(date));
    return { key: dayKey(date), date, ...pick(row) };
  });
}
