import { useState, useEffect, useCallback } from "react";
import { CircleBox } from "@/components/CircleBox";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseCharts } from "@/components/ExpenseCharts";
import { ExpenseList } from "@/components/ExpenseList";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2 } from "lucide-react";

interface SalarySettings {
  salary: number;
  needsPercent: number;
  savingsPercent: number;
  wantsPercent: number;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<SalarySettings>({
    salary: 0, needsPercent: 40, savingsPercent: 12, wantsPercent: 48,
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [settingsRes, expensesRes] = await Promise.all([
        supabase.from("salary_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      ]);

      if (settingsRes.data) {
        setSettings({
          salary: Number(settingsRes.data.salary),
          needsPercent: Number(settingsRes.data.needs_percent),
          savingsPercent: Number(settingsRes.data.savings_percent),
          wantsPercent: Number(settingsRes.data.wants_percent),
        });
      }

      if (expensesRes.data) {
        setExpenses(expensesRes.data.map((e) => ({
          id: e.id, date: e.date, description: e.description, amount: Number(e.amount),
        })));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Save salary settings
  const updateSettings = useCallback(async (newSettings: SalarySettings) => {
    if (!user) return;
    setSettings(newSettings);
    await supabase.from("salary_settings").upsert({
      user_id: user.id,
      salary: newSettings.salary,
      needs_percent: newSettings.needsPercent,
      savings_percent: newSettings.savingsPercent,
      wants_percent: newSettings.wantsPercent,
    }, { onConflict: "user_id" });
  }, [user]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const needsAmount = (settings.salary * settings.needsPercent) / 100;
  const savingsAmount = (settings.salary * settings.savingsPercent) / 100;
  const wantsAmount = (settings.salary * settings.wantsPercent) / 100;
  const needsRemaining = needsAmount - totalExpenses;

  const handleAddExpense = useCallback(async (date: string, description: string, amount: number) => {
    if (!user) return;
    const { data, error } = await supabase.from("expenses").insert({
      user_id: user.id, date, description, amount,
    }).select().single();

    if (data && !error) {
      setExpenses((prev) => [{
        id: data.id, date: data.date, description: data.description, amount: Number(data.amount),
      }, ...prev]);
    }
  }, [user]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-foreground">খরচের হিসাব</h1>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          লগআউট
        </Button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
          <CircleBox
            label="মোট বেতন"
            amount={settings.salary}
            colorVar="salary"
            percent={100}
            onEdit={(val) => updateSettings({ ...settings, salary: val })}
          />
          <CircleBox
            label="প্রয়োজন"
            amount={Math.max(0, needsRemaining)}
            percent={settings.needsPercent}
            colorVar="needs"
            onEdit={(val) => updateSettings({ ...settings, needsPercent: Math.min(100, Math.max(0, val)) })}
            subtitle={`বরাদ্দ: ৳${needsAmount.toLocaleString("bn-BD")}`}
          />
          <CircleBox
            label="সঞ্চয়"
            amount={savingsAmount}
            percent={settings.savingsPercent}
            colorVar="savings"
            onEdit={(val) => updateSettings({ ...settings, savingsPercent: Math.min(100, Math.max(0, val)) })}
          />
          <CircleBox
            label="ইচ্ছা"
            amount={wantsAmount}
            percent={settings.wantsPercent}
            colorVar="wants"
            onEdit={(val) => updateSettings({ ...settings, wantsPercent: Math.min(100, Math.max(0, val)) })}
          />
        </div>

        <ExpenseForm onAdd={handleAddExpense} />
        <ExpenseCharts expenses={expenses} />
        <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />
      </main>
    </div>
  );
}
