import { useState, useEffect, useCallback } from "react";
import { CircleBox } from "@/components/CircleBox";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseCharts } from "@/components/ExpenseCharts";
import { ExpenseList } from "@/components/ExpenseList";
import { MonthDetailDialog } from "@/components/MonthDetailDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2, CalendarCheck, History, FileDown } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { generatePdfReport } from "@/lib/generatePdfReport";
import { InstallAppButton } from "@/components/InstallAppButton";
import { UpdateAppButton } from "@/components/UpdateAppButton";

interface SalarySettings {
  salary: number;
  needsPercent: number;
  savingsPercent: number;
  wantsPercent: number;
  currentMonth: string;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  month: string;
}

interface MonthlyHistoryRecord {
  id: string;
  month: string;
  salary: number;
  total_expenses: number;
  needs_remaining: number;
  wants_remaining: number;
  savings_remaining: number;
  closed_at: string;
  needs_percent: number;
  savings_percent: number;
  wants_percent: number;
}

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

const formatMonth = (m: string) => {
  const [y, mo] = m.split("-");
  const idx = parseInt(mo, 10) - 1;
  return `${BN_MONTHS[idx] ?? mo} ${y}`;
};

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<SalarySettings>({
    salary: 0, needsPercent: 40, savingsPercent: 12, wantsPercent: 48, currentMonth: currentMonthKey(),
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<MonthlyHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyHistoryRecord | null>(null);

  const reloadHistory = useCallback(async () => {
    if (!user) return;
    const historyRes = await supabase
      .from("monthly_history")
      .select("*")
      .eq("user_id", user.id)
      .order("month", { ascending: false });
    if (historyRes.data) {
      const mapped = historyRes.data.map((h: any) => ({
        id: h.id,
        month: h.month,
        salary: Number(h.salary),
        total_expenses: Number(h.total_expenses),
        needs_remaining: Number(h.needs_remaining),
        wants_remaining: Number(h.wants_remaining),
        savings_remaining: Number(h.savings_remaining),
        closed_at: h.closed_at,
        needs_percent: Number(h.needs_percent),
        savings_percent: Number(h.savings_percent),
        wants_percent: Number(h.wants_percent),
      }));
      setHistory(mapped);
      // Refresh selected month with latest snapshot
      setSelectedMonth((prev) => prev ? mapped.find((m) => m.month === prev.month) ?? null : null);
    }
  }, [user]);

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [settingsRes, expensesRes, historyRes] = await Promise.all([
        supabase.from("salary_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("monthly_history").select("*").eq("user_id", user.id).order("month", { ascending: false }),
      ]);

      if (settingsRes.data) {
        setSettings({
          salary: Number(settingsRes.data.salary),
          needsPercent: Number(settingsRes.data.needs_percent),
          savingsPercent: Number(settingsRes.data.savings_percent),
          wantsPercent: Number(settingsRes.data.wants_percent),
          currentMonth: settingsRes.data.current_month ?? currentMonthKey(),
        });
      }

      if (expensesRes.data) {
        setExpenses(expensesRes.data.map((e) => ({
          id: e.id, date: e.date, description: e.description, amount: Number(e.amount), month: e.month,
        })));
      }

      if (historyRes.data) {
        setHistory(historyRes.data.map((h: any) => ({
          id: h.id,
          month: h.month,
          salary: Number(h.salary),
          total_expenses: Number(h.total_expenses),
          needs_remaining: Number(h.needs_remaining),
          wants_remaining: Number(h.wants_remaining),
          savings_remaining: Number(h.savings_remaining),
          closed_at: h.closed_at,
          needs_percent: Number(h.needs_percent),
          savings_percent: Number(h.savings_percent),
          wants_percent: Number(h.wants_percent),
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
      current_month: newSettings.currentMonth,
    }, { onConflict: "user_id" });
  }, [user]);

  // Only consider expenses for the active month
  const activeExpenses = expenses.filter((e) => e.month === settings.currentMonth);
  const totalExpenses = activeExpenses.reduce((s, e) => s + e.amount, 0);
  const needsAmount = (settings.salary * settings.needsPercent) / 100;
  const savingsAmount = (settings.salary * settings.savingsPercent) / 100;
  const wantsAmount = (settings.salary * settings.wantsPercent) / 100;

  // Cascading deduction: needs -> wants -> savings
  let remaining = totalExpenses;
  const needsUsed = Math.min(remaining, needsAmount);
  remaining -= needsUsed;
  const wantsUsed = Math.min(remaining, wantsAmount);
  remaining -= wantsUsed;
  const savingsUsed = Math.min(remaining, savingsAmount);

  const needsRemaining = Math.max(0, needsAmount - needsUsed);
  const wantsRemaining = Math.max(0, wantsAmount - wantsUsed);
  const savingsRemaining = Math.max(0, savingsAmount - savingsUsed);

  const handleAddExpense = useCallback(async (date: string, description: string, amount: number) => {
    if (!user) return;
    const month = settings.currentMonth;
    const { data, error } = await supabase.from("expenses").insert({
      user_id: user.id, date, description, amount, month,
    }).select().single();

    if (data && !error) {
      setExpenses((prev) => [{
        id: data.id, date: data.date, description: data.description, amount: Number(data.amount), month: data.month,
      }, ...prev]);
    }
  }, [user, settings.currentMonth]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleEditExpense = useCallback(async (id: string, date: string, description: string, amount: number) => {
    const month = date.substring(0, 7);
    const { error } = await supabase.from("expenses").update({
      date, description, amount, month,
    }).eq("id", id);
    if (error) {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
      return;
    }
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, date, description, amount, month } : e));
    toast.success("খরচ আপডেট করা হয়েছে");
  }, []);

  const handleCloseMonth = useCallback(async () => {
    if (!user) return;
    // Save closed month snapshot
    const { error: histErr } = await supabase.from("monthly_history").upsert({
      user_id: user.id,
      month: settings.currentMonth,
      salary: settings.salary,
      needs_percent: settings.needsPercent,
      savings_percent: settings.savingsPercent,
      wants_percent: settings.wantsPercent,
      total_expenses: totalExpenses,
      needs_remaining: needsRemaining,
      wants_remaining: wantsRemaining,
      savings_remaining: savingsRemaining,
    }, { onConflict: "user_id,month" });

    if (histErr) {
      toast.error("মাস ক্লোজ করতে সমস্যা হয়েছে");
      return;
    }

    // Compute next month key
    const [y, m] = settings.currentMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1); // m is 1-12, JS month-0 indexed -> next month
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

    // Reset salary to 0 for new month, keep percentages
    const newSettings: SalarySettings = {
      ...settings,
      salary: 0,
      currentMonth: nextMonth,
    };
    await updateSettings(newSettings);

    // Reload history
    const historyRes = await supabase
      .from("monthly_history")
      .select("*")
      .eq("user_id", user.id)
      .order("month", { ascending: false });
    if (historyRes.data) {
      setHistory(historyRes.data.map((h: any) => ({
        id: h.id,
        month: h.month,
        salary: Number(h.salary),
        total_expenses: Number(h.total_expenses),
        needs_remaining: Number(h.needs_remaining),
        wants_remaining: Number(h.wants_remaining),
        savings_remaining: Number(h.savings_remaining),
        closed_at: h.closed_at,
        needs_percent: Number(h.needs_percent),
        savings_percent: Number(h.savings_percent),
        wants_percent: Number(h.wants_percent),
      })));
    }

    toast.success(`${formatMonth(settings.currentMonth)} সফলভাবে ক্লোজ করা হয়েছে। নতুন মাসের বেতন ইনপুট দিন।`);
  }, [user, settings, totalExpenses, needsRemaining, wantsRemaining, savingsRemaining, updateSettings]);

  const handleDownloadPdf = useCallback(() => {
    try {
      generatePdfReport({
        monthLabel: formatMonth(settings.currentMonth),
        monthKey: settings.currentMonth,
        salary: settings.salary,
        needsPercent: settings.needsPercent,
        wantsPercent: settings.wantsPercent,
        savingsPercent: settings.savingsPercent,
        needsAmount,
        wantsAmount,
        savingsAmount,
        needsRemaining,
        wantsRemaining,
        savingsRemaining,
        totalExpenses,
        expenses: activeExpenses.map((e) => ({ date: e.date, description: e.description, amount: e.amount })),
      });
      toast.success("PDF রিপোর্ট ডাউনলোড হয়েছে");
    } catch (e) {
      console.error(e);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে");
    }
  }, [settings, needsAmount, wantsAmount, savingsAmount, needsRemaining, wantsRemaining, savingsRemaining, totalExpenses, activeExpenses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-card/80 border-b border-border/60 px-4 py-3 flex items-center justify-between shadow-soft">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-primary-foreground font-bold text-sm">
            ৳
          </div>
          <div className="flex flex-col leading-tight">
            <h1 className="text-base font-bold text-gradient-primary">খরচের হিসাব</h1>
            <span className="text-[10px] text-muted-foreground">{formatMonth(settings.currentMonth)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <History className="h-4 w-4" />
                ইতিহাস
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>মাসিক ইতিহাস</DialogTitle>
              </DialogHeader>
              {history.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">এখনো কোনো মাস ক্লোজ করা হয়নি</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => { setSelectedMonth(h); setHistoryOpen(false); }}
                      className="text-left rounded-lg border bg-card p-3 flex flex-col gap-2 hover:bg-accent/10 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{formatMonth(h.month)}</span>
                        <span className="text-xs text-muted-foreground">বেতন: ৳{h.salary.toLocaleString("bn-BD")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">মোট খরচ:</span><span className="font-medium text-destructive">৳{h.total_expenses.toLocaleString("bn-BD")}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">প্রয়োজন বাকি:</span><span className="font-medium">৳{h.needs_remaining.toLocaleString("bn-BD")}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">ইচ্ছা বাকি:</span><span className="font-medium">৳{h.wants_remaining.toLocaleString("bn-BD")}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">সঞ্চয় বাকি:</span><span className="font-medium">৳{h.savings_remaining.toLocaleString("bn-BD")}</span></div>
                      </div>
                      <span className="text-[10px] text-primary mt-1">এডিট করতে ক্লিক করুন →</span>
                    </button>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
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
            amount={needsRemaining}
            percent={settings.needsPercent}
            colorVar="needs"
            onEdit={(val) => updateSettings({ ...settings, needsPercent: Math.min(100, Math.max(0, val)) })}
            subtitle={`বরাদ্দ: ৳${needsAmount.toLocaleString("bn-BD")}`}
          />
          <CircleBox
            label="ইচ্ছা"
            amount={wantsRemaining}
            percent={settings.wantsPercent}
            colorVar="wants"
            onEdit={(val) => updateSettings({ ...settings, wantsPercent: Math.min(100, Math.max(0, val)) })}
            subtitle={`বরাদ্দ: ৳${wantsAmount.toLocaleString("bn-BD")}`}
          />
          <CircleBox
            label="সঞ্চয়"
            amount={savingsRemaining}
            percent={settings.savingsPercent}
            colorVar="savings"
            onEdit={(val) => updateSettings({ ...settings, savingsPercent: Math.min(100, Math.max(0, val)) })}
            subtitle={`বরাদ্দ: ৳${savingsAmount.toLocaleString("bn-BD")}`}
          />
        </div>

        <ExpenseForm onAdd={handleAddExpense} />
        <ExpenseCharts
          expenses={activeExpenses}
          history={history.map((h) => ({ month: h.month, total_expenses: h.total_expenses }))}
          currentMonth={settings.currentMonth}
        />
        <ExpenseList expenses={activeExpenses} onDelete={handleDeleteExpense} onEdit={handleEditExpense} />

        <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
          <FileDown className="h-4 w-4" />
          PDF রিপোর্ট ডাউনলোড করুন
        </Button>

        <InstallAppButton />

        <UpdateAppButton />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
              <CalendarCheck className="h-4 w-4" />
              মাস ক্লোজ করুন
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>মাস ক্লোজ করবেন?</AlertDialogTitle>
              <AlertDialogDescription>
                {formatMonth(settings.currentMonth)} এর হিসাব ক্লোজ হয়ে ইতিহাসে সংরক্ষিত হবে। নতুন মাস শুরু হবে এবং বেতন আবার ০ থেকে শুরু হবে। চলতি মাসের অবশিষ্ট টাকা পরের মাসে যোগ হবে না।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseMonth}>ক্লোজ করুন</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      {selectedMonth && user && (
        <MonthDetailDialog
          open={!!selectedMonth}
          onOpenChange={(o) => { if (!o) setSelectedMonth(null); }}
          userId={user.id}
          month={selectedMonth.month}
          monthLabel={formatMonth(selectedMonth.month)}
          salary={selectedMonth.salary}
          needsPercent={selectedMonth.needs_percent}
          savingsPercent={selectedMonth.savings_percent}
          wantsPercent={selectedMonth.wants_percent}
          onSnapshotUpdated={reloadHistory}
        />
      )}
    </div>
  );
}
