interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
}
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, date: string, description: string, amount: number) => void | Promise<void>;
}

export function ExpenseList({ expenses, onDelete, onEdit }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setEditDate(e.date);
    setEditDesc(e.description);
    setEditAmount(String(e.amount));
  };

  const saveEdit = async () => {
    if (!editingId || !onEdit) return;
    const amt = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amt) || amt <= 0 || !editDate) {
      toast.error("সঠিক তথ্য দিন");
      return;
    }
    await onEdit(editingId, editDate, editDesc.trim(), amt);
    setEditingId(null);
  };

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
                <div key={expense.id} className="px-4 py-2.5">
                  {editingId === expense.id ? (
                    <div className="flex flex-col gap-1.5">
                      <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="text-xs h-8" />
                      <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="বিবরণ" className="text-xs h-8" />
                      <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="পরিমাণ" className="text-xs h-8" />
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={saveEdit} className="h-7 gap-1 flex-1"><Check className="h-3 w-3" />সংরক্ষণ</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 gap-1"><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{expense.description}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-foreground">৳{expense.amount.toLocaleString("bn-BD")}</span>
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(expense)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
