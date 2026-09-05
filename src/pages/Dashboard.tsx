import { useState, useEffect, useCallback } from "react";
import { DashboardSummary } from "@/components/DashboardSummary";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseCharts } from "@/components/ExpenseCharts";
import { MonthDetailDialog } from "@/components/MonthDetailDialog";
import { SavingsDialog } from "@/components/SavingsDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2, CalendarCheck, History, FileDown } from "lucide-react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Menu } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_CATEGORY, getCategoryMeta } from "@/lib/expenseCategories";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryTargets } from "@/hooks/useCategoryTargets";
import { getTimeDiffInBn } from "@/lib/utils";
import { SearchResultRow } from "@/components/SearchResultRow";
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
  category: string;
  receipt_path?: string | null;
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
  return `${BN_MONTHS[idx] ?? mo} ${Number(y).toLocaleString("bn-BD", { useGrouping: false })}`;
};

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function Dashboard() {
  const { categories: EXPENSE_CATEGORIES } = useCategories();
  const { targets: categoryTargets } = useCategoryTargets();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<SalarySettings>({
    salary: 0, needsPercent: 40, savingsPercent: 12, wantsPercent: 48, currentMonth: currentMonthKey(),
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<MonthlyHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyHistoryRecord | null>(null);
  const [activeChart, setActiveChart] = useState<"daily" | "monthly" | "category">("daily");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [openSearchCat, setOpenSearchCat] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingsDialogOpen, setSavingsDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const toggleFilterCategory = (key: string) =>
    setFilterCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const clearFilters = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterCategories([]);
  };
  const filtersActive = Boolean(filterFrom || filterTo || filterCategories.length);

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

  // Search + filter results across current month + history
  const searchActive = Boolean(searchQuery.trim()) || filtersActive;
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!searchActive) return [] as Array<Expense & { monthLabel: string; isCurrent: boolean }>;
    return expenses
      .filter((e) => (q ? e.description.toLowerCase().includes(q) : true))
      .filter((e) => (filterFrom ? e.date >= filterFrom : true))
      .filter((e) => (filterTo ? e.date <= filterTo : true))
      .filter((e) =>
        filterCategories.length ? filterCategories.includes(e.category || DEFAULT_CATEGORY) : true
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e) => ({
        ...e,
        monthLabel: formatMonth(e.month),
        isCurrent: e.month === settings.currentMonth,
      }));
  })();
  const searchTotal = searchResults.reduce((s, e) => s + e.amount, 0);
  const searchCategoryTotals = (() => {
    const map = new Map<string, number>();
    searchResults.forEach((e) => {
      const k = e.category || DEFAULT_CATEGORY;
      map.set(k, (map.get(k) ?? 0) + e.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  })();

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
          id: e.id, date: e.date, description: e.description, amount: Number(e.amount), month: e.month, category: (e as any).category || "অন্যান্য",
          receipt_path: (e as any).receipt_path ?? null,
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
  const totalTarget = Object.values(categoryTargets).reduce((sum, v) => sum + Number(v || 0), 0);
  const monthlyBudget = totalTarget > 0 ? totalTarget : settings.salary;
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

  const needsRemainingPercent = needsAmount > 0 ? (needsRemaining / needsAmount) * 100 : 0;
  const wantsRemainingPercent = wantsAmount > 0 ? (wantsRemaining / wantsAmount) * 100 : 0;
  const savingsRemainingPercent = savingsAmount > 0 ? (savingsRemaining / savingsAmount) * 100 : 0;

  // Quick stats: today / this week / daily average
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun ... 6=Sat
    const diff = (day + 1) % 7; // days since last Saturday
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weekExpense = activeExpenses
    .filter((e) => {
      const ed = new Date(e.date);
      return ed >= weekStart && ed <= new Date();
    })
    .reduce((s, e) => s + e.amount, 0);

  const daysInMonth = (() => {
    const [yy, mm] = settings.currentMonth.split("-").map(Number);
    return new Date(yy, mm, 0).getDate();
  })();
  const dailyAverage = daysInMonth > 0 ? Math.round(totalExpenses / daysInMonth) : 0;
  const recentExpenseDate = activeExpenses.reduce((latest, expense) => expense.date > latest ? expense.date : latest, "");
  const recentDailyExpense = activeExpenses
    .filter((expense) => expense.date === recentExpenseDate)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const dailyTotals = activeExpenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.date] = (totals[expense.date] ?? 0) + expense.amount;
    return totals;
  }, {});
  const dailyTrend = Object.keys(dailyTotals).sort().slice(-8).map((date) => dailyTotals[date]);
  const previousMonthTotal = history
    .filter((record) => record.month < settings.currentMonth)
    .sort((a, b) => b.month.localeCompare(a.month))[0]?.total_expenses;

  const handleAddExpense = useCallback(async (date: string, description: string, amount: number, category: string, photo?: File | null) => {
    if (!user) return;
    const month = settings.currentMonth;
    const { data, error } = await supabase.from("expenses").insert({
      user_id: user.id, date, description, amount, month, category,
    }).select().single();

    if (data && !error) {
      let receiptPath: string | null = null;
      if (photo) {
        const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${data.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from("receipts").upload(path, photo, { upsert: true });
        if (!upErr) {
          receiptPath = path;
          await supabase.from("expenses").update({ receipt_path: path } as any).eq("id", data.id).eq("user_id", user.id);
        } else {
          toast.error("ছবি আপলোড করা যায়নি");
        }
      }
      setExpenses((prev) => [{
        id: data.id, date: data.date, description: data.description, amount: Number(data.amount), month: data.month, category: (data as any).category || category,
        receipt_path: receiptPath,
      }, ...prev]);
    }
  }, [user, settings.currentMonth]);

  const handlePhotoChange = useCallback(async (id: string, photo: File | null) => {
    if (!user) return;
    const current = expenses.find((e) => e.id === id);
    if (!current) return;

    // Remove old file if it exists
    if (current.receipt_path) {
      await supabase.storage.from("receipts").remove([current.receipt_path]);
    }

    let receiptPath: string | null = null;
    if (photo) {
      const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, photo, { upsert: true });
      if (upErr) {
        toast.error("ছবি আপলোড করা যায়নি");
        return;
      }
      receiptPath = path;
    }

    const { error } = await supabase.from("expenses").update({ receipt_path: receiptPath } as any).eq("id", id).eq("user_id", user.id);
    if (error) {
      toast.error("ছবি সংরক্ষণে সমস্যা হয়েছে");
      return;
    }
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, receipt_path: receiptPath } : e));
    toast.success(photo ? "ছবি সংরক্ষিত হয়েছে" : "ছবি মুছে গেছে");
  }, [user, expenses]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast.error("খরচ মুছতে সমস্যা হয়েছে");
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, [user]);

  const handleEditExpense = useCallback(async (id: string, date: string, description: string, amount: number, category: string) => {
    if (!user) return;
    const month = date.substring(0, 7);
    const { error } = await supabase
      .from("expenses")
      .update({ date, description, amount, month, category })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("খরচ আপডেট করতে সমস্যা হয়েছে");
      return;
    }
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, date, description, amount, month, category } : e));
  }, [user]);

  const handleSearchEdit = useCallback(async (id: string, date: string, description: string, amount: number, category: string) => {
    await handleEditExpense(id, date, description, amount, category);
    await reloadHistory();
  }, [handleEditExpense, reloadHistory]);

  const handleSearchDelete = useCallback(async (id: string) => {
    await handleDeleteExpense(id);
    await reloadHistory();
  }, [handleDeleteExpense, reloadHistory]);

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

  const handleDownloadPdf = useCallback(async () => {
    try {
      const view: "daily" | "category" = activeChart === "category" ? "category" : "daily";
      await generatePdfReport({
        view,
        monthLabel: formatMonth(settings.currentMonth),
        monthKey: settings.currentMonth,
        expenses: activeExpenses.map((e) => ({ date: e.date, description: e.description, amount: e.amount })),
      });
      toast.success("PDF রিপোর্ট ডাউনলোড হয়েছে");
    } catch (e) {
      console.error(e);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে");
    }
  }, [settings, activeExpenses, activeChart]);

  const handleDownloadHistoryPdf = useCallback(async (month: string, monthLabel: string, view: "daily" | "category") => {
    try {
      const { data } = await supabase
        .from("expenses")
        .select("date, description, amount")
        .eq("user_id", user?.id)
        .eq("month", month)
        .order("date", { ascending: true });
      const expenses = (data || []).map((e: any) => ({
        date: e.date,
        description: e.description,
        amount: Number(e.amount),
      }));
      await generatePdfReport({
        view,
        monthLabel,
        monthKey: month,
        expenses,
      });
      toast.success("PDF রিপোর্ট ডাউনলোড হয়েছে");
    } catch (e) {
      console.error(e);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে");
    }
  }, [user]);

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
                    <div
                      key={h.id}
                      className="rounded-lg border bg-card p-3 flex flex-col gap-2 hover:bg-accent/10 hover:border-primary/40 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => { setSelectedMonth(h); setHistoryOpen(false); }}
                        className="text-left flex flex-col gap-2 w-full"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{formatMonth(h.month)}</span>
                          <span className="text-xs text-muted-foreground">বেতন: ৳{h.salary.toLocaleString("bn-BD")}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">মোট খরচ:</span><span className="font-medium text-destructive">৳{h.total_expenses.toLocaleString("bn-BD")}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">প্রয়োজন বাকি:</span><span className="font-medium">৳{h.needs_remaining.toLocaleString("bn-BD")}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">হাত খরচ বাকি:</span><span className="font-medium">৳{h.wants_remaining.toLocaleString("bn-BD")}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">সঞ্চয় বাকি:</span><span className="font-medium">৳{h.savings_remaining.toLocaleString("bn-BD")}</span></div>
                        </div>
                      </button>
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadHistoryPdf(h.month, formatMonth(h.month), "daily");
                          }}
                        >
                          <FileDown className="h-3 w-3" />
                          দৈনিক PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadHistoryPdf(h.month, formatMonth(h.month), "category");
                          }}
                        >
                          <FileDown className="h-3 w-3" />
                          খাতওয়ারি PDF
                        </Button>
                      </div>
                    </div>
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0" aria-label="মেনু">
                  <Menu className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSavingsDialogOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted"
                >
                  <span aria-hidden>💰</span>
                  সঞ্চয়
                </button>
              </PopoverContent>
            </Popover>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="খরচ খুঁজুন (বর্তমান মাস ও ইতিহাসসহ)..."
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"
                  aria-label="সার্চ মুছুন"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative shrink-0" aria-label="ফিল্টার">
                  <SlidersHorizontal className="h-4 w-4" />
                  {filtersActive && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(20rem,90vw)] p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">ফিল্টার</span>
                  {filtersActive && (
                    <button type="button" onClick={clearFilters} className="text-xs text-destructive font-medium">
                      রিসেট
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">কাস্টম তারিখ</span>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9 text-xs" />
                    <span className="text-xs text-muted-foreground">থেকে</span>
                    <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">খাত</span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-1 py-1 hover:bg-muted/60">
                        <Checkbox
                          checked={filterCategories.includes(c.key)}
                          onCheckedChange={() => toggleFilterCategory(c.key)}
                        />
                        <span>{c.emoji} {c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button size="sm" onClick={() => setFilterOpen(false)}>প্রয়োগ করুন</Button>
              </PopoverContent>
            </Popover>
          </div>
          {filtersActive && (
            <div className="flex flex-wrap gap-1.5">
              {(filterFrom || filterTo) && (
                <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
                  {filterFrom ? new Date(filterFrom).toLocaleDateString("bn-BD") : "শুরু"} — {filterTo ? new Date(filterTo).toLocaleDateString("bn-BD") : "শেষ"}
                  <button type="button" onClick={() => { setFilterFrom(""); setFilterTo(""); }} aria-label="তারিখ ফিল্টার মুছুন">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterCategories.map((k) => (
                <Badge key={k} variant="secondary" className="gap-1 text-[10px] font-medium">
                  {getCategoryMeta(k).emoji} {getCategoryMeta(k).label}
                  <button type="button" onClick={() => toggleFilterCategory(k)} aria-label="খাত ফিল্টার মুছুন">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {searchActive && (
            <div className="rounded-xl border border-border/60 gradient-card shadow-soft overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/40">
                <span className="text-xs font-semibold text-foreground">
                  সার্চ ফলাফল ({searchResults.length.toLocaleString("bn-BD")})
                </span>
                <span className="text-xs font-bold text-destructive">মোট: ৳{searchTotal.toLocaleString("bn-BD")}</span>
              </div>
              {searchResults.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">কোনো ফলাফল পাওয়া যায়নি</p>
              ) : (
                <>
                {searchCategoryTotals.length > 0 && (
                  <div className="px-4 py-2 border-b border-border/40 bg-muted/20 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">খাতওয়ারি মোট</span>
                    {searchCategoryTotals.map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setOpenSearchCat(openSearchCat === k ? null : k)}
                          className="flex items-center justify-between text-xs w-full py-0.5 hover:bg-muted/40 rounded"
                        >
                          <span className="text-foreground text-left">{getCategoryMeta(k).emoji} {getCategoryMeta(k).label}</span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold">৳{v.toLocaleString("bn-BD")}</span>
                            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${openSearchCat === k ? "rotate-180" : ""}`} />
                          </span>
                        </button>
                        {openSearchCat === k && (
                          <div className="mt-1 mb-1 ml-2 pl-2 border-l border-border/60 max-h-52 overflow-y-auto flex flex-col gap-1">
                            {searchResults
                              .filter((e) => (e.category || DEFAULT_CATEGORY) === k)
                              .map((e) => (
                                <div key={e.id} className="flex items-start justify-between gap-2 text-[11px]">
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-foreground truncate">{e.description}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(e.date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}
                                    </span>
                                  </div>
                                  <span className="font-medium shrink-0">৳{e.amount.toLocaleString("bn-BD")}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="max-h-80 overflow-y-auto divide-y">
                  {searchResults.map((e) => (
                    <SearchResultRow
                      key={e.id}
                      expense={e}
                      onEdit={handleSearchEdit}
                      onDelete={handleSearchDelete}
                    />
                  ))}
                </div>
                <p className="px-4 py-1.5 text-[10px] text-muted-foreground bg-muted/20">টিপস: বামে সোয়াইপ করে এডিট/ডিলিট করুন</p>
                </>
              )}
            </div>
          )}
        </div>

        <DashboardSummary
          monthLabel={formatMonth(settings.currentMonth)}
          currentMonth={settings.currentMonth}
          totalExpenses={totalExpenses}
          salary={settings.salary}
          budget={monthlyBudget}
          recentDailyExpense={recentDailyExpense}
          weekExpense={weekExpense}
          dailyAverage={dailyAverage}
          previousMonthTotal={previousMonthTotal}
          dailyTrend={dailyTrend}
          dailyTotals={dailyTotals}
          onSalaryEdit={(value) => updateSettings({ ...settings, salary: value })}
          needs={{
            amount: needsRemaining,
            percent: settings.needsPercent,
            remainingPercent: needsRemainingPercent,
            allocation: needsAmount,
            onEdit: (value) => updateSettings({ ...settings, needsPercent: Math.min(100, Math.max(0, value)) }),
          }}
          wants={{
            amount: wantsRemaining,
            percent: settings.wantsPercent,
            remainingPercent: wantsRemainingPercent,
            allocation: wantsAmount,
            onEdit: (value) => updateSettings({ ...settings, wantsPercent: Math.min(100, Math.max(0, value)) }),
          }}
          savings={{
            amount: savingsRemaining,
            percent: settings.savingsPercent,
            remainingPercent: savingsRemainingPercent,
            allocation: savingsAmount,
            onEdit: (value) => updateSettings({ ...settings, savingsPercent: Math.min(100, Math.max(0, value)) }),
          }}
        />

        <ExpenseForm onAdd={handleAddExpense} />
        <ExpenseCharts
          expenses={activeExpenses}
          allExpenses={expenses}
          history={history.map((h) => ({ month: h.month, total_expenses: h.total_expenses, salary: h.salary }))}
          currentMonth={settings.currentMonth}
          onDeleteExpense={handleDeleteExpense}
          onEditExpense={handleEditExpense}
          onPhotoChange={handlePhotoChange}
          onTabChange={(t) => setActiveChart(t as "daily" | "monthly" | "category")}
          salary={settings.salary}
        />

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

      {user && (
        <SavingsDialog open={savingsDialogOpen} onOpenChange={setSavingsDialogOpen} userId={user.id} />
      )}

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
