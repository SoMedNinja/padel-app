// Enkel generell sortering för tabeller
export function sortRows<T>(rows: T[], key: keyof T, asc: boolean): T[] {
  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    if (asc) return aVal < bVal ? -1 : 1;
    return aVal > bVal ? -1 : 1;
  });
}
