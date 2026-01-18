// Enkel generell sortering för tabeller
export function sortRows(rows, key, asc) {
  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    return asc ? aVal - bVal : bVal - aVal;
  });
}
