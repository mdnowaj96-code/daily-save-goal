import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, ImagePlus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, DEFAULT_CATEGORY } from "@/lib/expenseCategories";
import { useCategories } from "@/hooks/useCategories";
import { ManageCategoriesDialog } from "@/components/ManageCategoriesDialog";

interface ExpenseFormProps {
  onAdd: (date: string, description: string, amount: number, category: string, photo?: File | null) => void;
}

// Get current date in Bangladesh (UTC+6) as YYYY-MM-DD
function getBdToday(): string {
  const now = new Date();
  const bd = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60000);
  const y = bd.getFullYear();
  const m = String(bd.getMonth() + 1).padStart(2, "0");
  const d = String(bd.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Ms until next Bangladesh midnight
function msUntilBdMidnight(): number {
  const now = new Date();
  const bdNow = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60000);
  const nextBdMidnight = new Date(bdNow);
  nextBdMidnight.setHours(24, 0, 0, 50);
  return nextBdMidnight.getTime() - bdNow.getTime();
}

export function ExpenseForm({ onAdd }: ExpenseFormProps) {
  const { categories } = useCategories();
  const [date, setDate] = useState(getBdToday());
  const userEditedRef = useRef(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-update the date to today (BD time) at midnight, unless the user manually changed it
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        if (!userEditedRef.current) {
          setDate(getBdToday());
        }
        schedule();
      }, msUntilBdMidnight());
    };
    schedule();

    // Also refresh when tab regains focus / visibility
    const onVisible = () => {
      if (!userEditedRef.current && document.visibilityState === "visible") {
        setDate(getBdToday());
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!date || !description.trim() || isNaN(val) || val <= 0) return;
    onAdd(date, description.trim(), val, category, photo);
    setDescription("");
    setAmount("");
    setCategory(DEFAULT_CATEGORY);
    clearPhoto();
    // After submit, snap back to current BD date for the next entry
    userEditedRef.current = false;
    setDate(getBdToday());
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 gradient-card shadow-soft">
      <h3 className="text-sm font-semibold text-gradient-primary">নতুন খরচ যোগ করুন</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            userEditedRef.current = e.target.value !== getBdToday();
            setDate(e.target.value);
          }}
          className="text-sm"
        />
        <Input
          placeholder="খরচের বিবরণ"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-sm"
        />
        <Input
          type="number"
          placeholder="পরিমাণ (৳)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="text-sm h-10 flex-1">
            <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                <span className="mr-2">{c.emoji}</span>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ManageCategoriesDialog />
      </div>
      <Button type="submit" className="w-full sm:w-auto sm:self-end gap-2 gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity">
        <Plus className="h-4 w-4" />
        যোগ করুন
      </Button>
    </form>
  );
}
