import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Check, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  month: string;
}

interface MonthDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  month: string;
  monthLabel: string;
  salary: number;
  needsPercent: number;
  savingsPercent: number;
  wantsPercent: number;
  onSnapshotUpdated: () => void;
}

export function MonthDetailDialog({
  open, onOpenChange, userId, month, monthLabel,
  salary, needsPercent, savingsPercent, wantsPercent, onSnapshotUpdated,
}: MonthDetailDialogProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");

  // Add form state
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(`${month}-01`);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .eq("month", month)
      .order("date", { ascending: false });
    if (data) {
      setExpenses(data.map((e: any) => ({
        id: e.id, date: e.date, description: e.description, amount: Number(e.amount), month: e.month,
      })));
    }
    setLoading(false);
  }, [userId, month]);

  useEffect(() => {
    if (open) {
      load();
      setNewDate(`${month}-01`);
      setEditingId(null);
    }
  }, [open, load, month]);

  const recomputeAndSaveSnapshot = useCallback(async (list: Expense[]) => {
    const totalExpenses = list.reduce((s, e) => s + e.amount, 0);
    const needsAmount = (salary * needsPercent) / 100;
    const wantsAmount = (salary * wantsPercent) / 100;
    const savingsAmount = (salary * savingsPercent) / 100;

    let rem = totalExpenses;
    const needsUsed = Math.min(rem, needsAmount); rem -= needsUsed;
    const wantsUsed = Math.min(rem, wantsAmount); rem -= wantsUsed;
    const savingsUsed = Math.min(rem, savingsAmount);

    await supabase.from("monthly_history").update({
      total_expenses: totalExpenses,
      needs_remaining: Math.max(0, needsAmount - needsUsed),
      wants_remaining: Math.max(0, wantsAmount - wantsUsed),
      savings_remaining: Math.max(0, savingsAmount - savingsUsed),
    }).eq("user_id", userId).eq("month", month);

    onSnapshotUpdated();
  }, [userId, month, salary, needsPercent, wantsPercent, savingsPercent, onSnapshotUpdated]);

  const handleStartEdit = (e: Expense) => {
    setEditingId(e.id);
    setEditDesc(e.description);
    setEditAmount(String(e.amount));
    setEditDate(e.date);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const amt = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amt) || amt <= 0 || !editDate) {
      toast.error("সঠিক তথ্য দিন");
      return;
    }
    const { error } = await supabase.from("expenses").update({
      description: editDesc.trim(),
      amount: amt,
      date: editDate,
    }).eq("id", editingId);
    if (error) { toast.error("আপডেট করতে সমস্যা হয়েছে"); return; }
    const updated = expenses.map((e) =>
      e.id === editingId ? { ...e, description: editDesc.trim(), amount: amt, date: editDate } : e
    );
    setExpenses(updated);
    setEditingId(null);
    await recomputeAndSaveSnapshot(updated);
    toast.success("খরচ আপডেট করা হয়েছে");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error("ডিলিট করতে সমস্যা হয়েছে"); return; }
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    await recomputeAndSaveSnapshot(updated);
    toast.success("খরচ মুছে ফেলা হয়েছে");
  };

  const handleAdd = async () => {
    const amt = parseFloat(newAmount);
    if (!newDesc.trim() || isNaN(amt) || amt <= 0 || !newDate) {
      toast.error("সঠিক তথ্য দিন");
      return;
    }
    if (!newDate.startsWith(month)) {
      toast.error(`তারিখ অবশ্যই ${monthLabel} এর মধ্যে হতে হবে`);
      return;
    }
    const { data, error } = await supabase.from("expenses").insert({
      user_id: userId,
      date: newDate,
      description: newDesc.trim(),
      amount: amt,
      month,
    }).select().single();
    if (error || !data) { toast.error("যোগ করতে সমস্যা হয়েছে"); return; }
    const updated = [{
      id: data.id, date: data.date, description: data.description, amount: Number(data.amount), month: data.month,
    }, ...expenses];
    setExpenses(updated);
    setNewDesc(""); setNewAmount("");
    await recomputeAndSaveSnapshot(updated);
    toast.success("খরচ যোগ করা হয়েছে");
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{monthLabel} - খরচ এডিট</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted-foreground">মোট খরচ</span>
          <span className="font-bold text-destructive">৳{total.toLocaleString("bn-BD")}</span>
        </div>

        {/* Add new */}
        <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
          <span className="text-xs font-semibold">নতুন খরচ যোগ করুন</span>
          <Input type="date" value={newDate} min={`${month}-01`} max={`${month}-31`} onChange={(e) => setNewDate(e.target.value)} className="text-xs h-8" />
          <Input placeholder="বিবরণ" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="text-xs h-8" />
          <Input type="number" placeholder="পরিমাণ (৳)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="text-xs h-8" />
          <Button size="sm" onClick={handleAdd} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" /> যোগ করুন
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : expenses.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">এই মাসে কোনো খরচ নেই</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {expenses.map((e) => (
              <div key={e.id} className="rounded-md border bg-card p-2">
                {editingId === e.id ? (
                  <div className="flex flex-col gap-1.5">
                    <Input type="date" value={editDate} min={`${month}-01`} max={`${month}-31`} onChange={(ev) => setEditDate(ev.target.value)} className="text-xs h-8" />
                    <Input value={editDesc} onChange={(ev) => setEditDesc(ev.target.value)} className="text-xs h-8" />
                    <Input type="number" value={editAmount} onChange={(ev) => setEditAmount(ev.target.value)} className="text-xs h-8" />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={handleSaveEdit} className="h-7 gap-1 flex-1"><Check className="h-3 w-3" />সংরক্ষণ</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 gap-1"><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-foreground truncate">{e.description}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(e.date).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">৳{e.amount.toLocaleString("bn-BD")}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}