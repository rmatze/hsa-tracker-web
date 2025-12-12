export function formatCurrency(value: number | string): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


