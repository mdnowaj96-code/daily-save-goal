import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ExpenseFormProps {
  onAdd: (date: string, description: string, amount: number) => void;
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
  const [date, setDate] = useState(getBdToday());
  const userEditedRef = useRef(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!date || !description.trim() || isNaN(val) || val <= 0) return;
    onAdd(date, description.trim(), val);
    setDescription("");
    setAmount("");
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
      <Button type="submit" className="w-full sm:w-auto sm:self-end gap-2 gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity">
        <Plus className="h-4 w-4" />
        যোগ করুন
      </Button>
    </form>
  );
}
