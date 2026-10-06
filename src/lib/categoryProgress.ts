export function categoryProgress(amount: number, target: number, salary: number, totalExpenses: number) {
  const base = target > 0 ? target : salary > 0 ? salary : totalExpenses;
  const percent = base > 0 ? (amount / base) * 100 : 0;
  const color = percent > 100 ? "budget-over" : percent <= 25 ? "budget-safe" : percent <= 50 ? "budget-steady" : percent <= 75 ? "budget-warning" : "budget-danger";
  return { percent, fill: Math.min(100, Math.max(0, percent)), color };
}