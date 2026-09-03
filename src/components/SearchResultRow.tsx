import { useRef, useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DEFAULT_CATEGORY, getCategoryMeta } from "@/lib/expenseCategories";
import { useCategories } from "@/hooks/useCategories";
import { getTimeDiffInBn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface SearchResultItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  monthLabel: string;
  isCurrent: boolean;
}

interface Props {
  expense: SearchResultItem;
  onEdit: (id: string, date: string, description: string, amount: number, category: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export function SearchResultRow({ expense, onEdit, onDelete }: Props) {
  const { categories } = useCategories();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [date, setDate] = useState(expense.date);
  const [desc, setDesc] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState(expense.category || DEFAULT_CATEGORY);
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -40) setRevealed(true);
    else if (dx > 40) setRevealed(false);
    startX.current = null;
  };

  const startEdit = () => {
    setDate(expense.date);
    setDesc(expense.description);
    setAmount(String(expense.amount));
    setCategory(expense.category || DEFAULT_CATEGORY);
    setEditing(true);
    setRevealed(false);
  };

  const save = async () => {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0 || !date) {
      toast.error("সঠিক তথ্য দিন");
      return;
    }
    await onEdit(expense.id, date, desc.trim(), amt, category);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-4 py-2.5 flex flex-col gap-1.5">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-xs h-8" />
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="বিবরণ" className="text-xs h-8" />
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="পরিমাণ" className="text-xs h-8" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={save} className="h-7 gap-1 flex-1"><Check className="h-3 w-3" />সংরক্ষণ</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 gap-1"><X className="h-3 w-3" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={startEdit}
          className="px-4 bg-primary text-primary-foreground flex items-center"
          aria-label="এডিট"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { setRevealed(false); setConfirmOpen(true); }}
          className="px-4 bg-destructive text-destructive-foreground flex items-center"
          aria-label="মুছুন"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div
        className={`relative bg-card px-4 py-2.5 flex items-center justify-between gap-2 transition-transform duration-200 ${revealed ? "-translate-x-24" : "translate-x-0"}`}
        onClick={() => revealed && setRevealed(false)}
        onDoubleClick={startEdit}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-foreground truncate">
            {getCategoryMeta(expense.category || DEFAULT_CATEGORY).emoji} {expense.description}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(expense.date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            <span className={expense.isCurrent ? "text-primary font-medium" : ""}>
              {expense.isCurrent ? "বর্তমান মাস" : expense.monthLabel}
            </span>
          </span>
          <span className="text-[10px] text-muted-foreground">{getTimeDiffInBn(expense.date)}</span>
        </div>
        <span className="text-sm font-semibold text-foreground shrink-0">৳{expense.amount.toLocaleString("bn-BD")}</span>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>খরচ মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              "{expense.description}" - ৳{expense.amount.toLocaleString("bn-BD")} খরচটি স্থায়ীভাবে মুছে যাবে।
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
  );
}
