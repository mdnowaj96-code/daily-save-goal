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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, date: string, description: string, amount: number) => void | Promise<void>;
  salary?: number;
}

export function ExpenseList({ expenses, onDelete, onEdit, salary = 0 }: ExpenseListProps) {
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>খরচ মুছবেন?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{expense.description}" - ৳{expense.amount.toLocaleString("bn-BD")} খরচটি স্থায়ীভাবে মুছে যাবে। এই কাজটি ফিরিয়ে আনা যাবে না।
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(expense.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            মুছুন
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">খরচের তালিকা</h3>
        <span className="text-sm font-bold text-destructive">মোট: ৳{totalExpenses.toLocaleString("bn-BD")}</span>
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
