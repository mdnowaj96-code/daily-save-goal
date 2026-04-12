interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
}
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by date
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">খরচের তালিকা</h3>
        <span className="text-sm font-bold text-destructive">মোট: ৳{totalExpenses.toLocaleString("bn-BD")}</span>
      </div>

      {sortedDates.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">এখনো কোনো খরচ যোগ করা হয়নি</p>
      )}

      {sortedDates.map((date) => {
        const dayTotal = grouped[date].reduce((s, e) => s + e.amount, 0);
        return (
          <div key={date} className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
              <span className="text-xs font-semibold text-foreground">
                {new Date(date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="text-xs font-bold text-muted-foreground">৳{dayTotal.toLocaleString("bn-BD")}</span>
            </div>
            <div className="divide-y">
              {grouped[date].map((expense) => (
                <div key={expense.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-foreground">{expense.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">৳{expense.amount.toLocaleString("bn-BD")}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(expense.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
