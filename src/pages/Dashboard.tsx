import { useState, useEffect, useCallback } from "react";
import { CircleBox } from "@/components/CircleBox";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { Button } from "@/components/ui/button";
import { loadData, saveData, logout, type AppData, type Expense } from "@/lib/store";
import { LogOut } from "lucide-react";

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);

  const needsAmount = (data.salary * data.needsPercent) / 100;
  const savingsAmount = (data.salary * data.savingsPercent) / 100;
  const wantsAmount = (data.salary * data.wantsPercent) / 100;
  const needsRemaining = needsAmount - totalExpenses;

  const handleAddExpense = useCallback((date: string, description: string, amount: number) => {
    const expense: Expense = {
      id: crypto.randomUUID(),
      date,
      description,
      amount,
    };
    setData((prev) => ({ ...prev, expenses: [...prev.expenses, expense] }));
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    setData((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
  }, []);

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-foreground">খরচের হিসাব</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          লগআউট
        </Button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Circle Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
          <CircleBox
            label="মোট বেতন"
            amount={data.salary}
            colorVar="salary"
            percent={100}
            onEdit={(val) => setData((prev) => ({ ...prev, salary: val }))}
          />
          <CircleBox
            label="প্রয়োজন"
            amount={Math.max(0, needsRemaining)}
            percent={data.needsPercent}
            colorVar="needs"
            onEdit={(val) => setData((prev) => ({ ...prev, needsPercent: Math.min(100, Math.max(0, val)) }))}
            subtitle={`বরাদ্দ: ৳${needsAmount.toLocaleString("bn-BD")}`}
          />
          <CircleBox
            label="সঞ্চয়"
            amount={savingsAmount}
            percent={data.savingsPercent}
            colorVar="savings"
            onEdit={(val) => setData((prev) => ({ ...prev, savingsPercent: Math.min(100, Math.max(0, val)) }))}
          />
          <CircleBox
            label="ইচ্ছা"
            amount={wantsAmount}
            percent={data.wantsPercent}
            colorVar="wants"
            onEdit={(val) => setData((prev) => ({ ...prev, wantsPercent: Math.min(100, Math.max(0, val)) }))}
          />
        </div>

        {/* Add Expense */}
        <ExpenseForm onAdd={handleAddExpense} />

        {/* Expense List */}
        <ExpenseList expenses={data.expenses} onDelete={handleDeleteExpense} />
      </main>
    </div>
  );
}
