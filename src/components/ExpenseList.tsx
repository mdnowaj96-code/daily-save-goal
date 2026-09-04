interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  receipt_path?: string | null;
}
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExpenseRow } from "@/components/ExpenseRow";

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, date: string, description: string, amount: number, category: string) => void | Promise<void>;
  onPhotoChange?: (id: string, photo: File | null) => void | Promise<void>;
  salary?: number;
}

export function ExpenseList({ expenses, onDelete, onEdit, onPhotoChange, salary = 0 }: ExpenseListProps) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by date
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const recentDates = sortedDates.slice(0, 2);
  const olderDates = sortedDates.slice(2);

  const renderDateBlock = (date: string) => {
    const dayTotal = grouped[date].reduce((s, e) => s + e.amount, 0);
    return (
      <div key={date} className="rounded-xl border border-border/60 gradient-card overflow-hidden shadow-soft animate-fade-in">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/40">
          <span className="text-xs font-semibold text-foreground">
            {new Date(date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span className="text-xs font-bold text-muted-foreground">৳{dayTotal.toLocaleString("bn-BD")}</span>
        </div>
        <div className="divide-y">
          {grouped[date].map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} onPhotoChange={onPhotoChange} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-end px-1 gap-0.5">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-sm font-semibold text-foreground">খরচের তালিকা</h3>
          <span className="text-sm font-bold text-destructive">মোট: ৳{totalExpenses.toLocaleString("bn-BD")}</span>
        </div>
        {salary > 0 && totalExpenses > salary && (
          <span className="text-xs font-semibold text-destructive">
            অতিরিক্ত খরচ: ৳{(totalExpenses - salary).toLocaleString("bn-BD")}
          </span>
        )}
      </div>

      {sortedDates.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">এখনো কোনো খরচ যোগ করা হয়নি</p>
      )}

      {recentDates.map(renderDateBlock)}

      {olderDates.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden shadow-soft">
          <div className="px-4 py-2 border-b border-border/40 bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground">পুরোনো খরচসমূহ ({olderDates.length.toLocaleString("bn-BD")} দিন)</span>
          </div>
          <ScrollArea className="h-72">
            <div className="flex flex-col gap-3 p-3">
              {olderDates.map(renderDateBlock)}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
