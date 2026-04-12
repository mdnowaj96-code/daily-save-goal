import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ExpenseFormProps {
  onAdd: (date: string, description: string, amount: number) => void;
}

export function ExpenseForm({ onAdd }: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!date || !description.trim() || isNaN(val) || val <= 0) return;
    onAdd(date, description.trim(), val);
    setDescription("");
    setAmount("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
      <h3 className="text-sm font-semibold text-foreground">নতুন খরচ যোগ করুন</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
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
      <Button type="submit" className="w-full sm:w-auto sm:self-end gap-2">
        <Plus className="h-4 w-4" />
        যোগ করুন
      </Button>
    </form>
  );
}
