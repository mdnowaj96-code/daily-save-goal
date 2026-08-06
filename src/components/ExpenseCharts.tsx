import { useMemo, useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseList } from "@/components/ExpenseList";
import { DEFAULT_CATEGORY, getCategoryMeta } from "@/lib/expenseCategories";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryTargets } from "@/hooks/useCategoryTargets";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight, Target, Check, X } from "lucide-react";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
}

interface MonthlyHistoryItem {
  month: string; // YYYY-MM
  total_expenses: number;
  salary?: number;
}

interface ExpenseChartsProps {
  expenses: Expense[];
  history?: MonthlyHistoryItem[];
  currentMonth?: string;
  onDeleteExpense?: (id: string) => void;
  onEditExpense?: (id: string, date: string, description: string, amount: number, category: string) => void | Promise<void>;
  onTabChange?: (tab: string) => void;
  salary?: number;
  allExpenses?: Expense[];
}

const COLORS = [
  "hsl(210, 70%, 50%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(38, 90%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(190, 70%, 45%)",
];

const GRADIENTS: Array<[string, string]> = [
  ["hsl(210, 80%, 60%)", "hsl(210, 80%, 45%)"],
  ["hsl(340, 75%, 65%)", "hsl(340, 75%, 50%)"],
  ["hsl(160, 65%, 55%)", "hsl(160, 65%, 40%)"],
  ["hsl(38, 95%, 65%)", "hsl(38, 95%, 50%)"],
  ["hsl(270, 70%, 65%)", "hsl(270, 70%, 50%)"],
  ["hsl(190, 80%, 55%)", "hsl(190, 80%, 40%)"],
];

const BN_MONTHS = [
  "জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন",
  "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে",
];

const BN_MONTHS_FULL = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

const toBnDigits = (s: string | number) =>
  String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export function ExpenseCharts({ expenses, history = [], currentMonth, onDeleteExpense, onEditExpense, onTabChange, salary, allExpenses }: ExpenseChartsProps) {
  const { categories: EXPENSE_CATEGORIES } = useCategories();
  const { targets, setTarget } = useCategoryTargets();
  const [editTargetCat, setEditTargetCat] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [openMonthCat, setOpenMonthCat] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; amount: number } | null>(null);
  const dailyPanelRef = useRef<HTMLDivElement>(null);
  const monthlyPanelRef = useRef<HTMLDivElement>(null);
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (!selectedDay) return;
    const handleClick = (e: MouseEvent) => {
      if (dailyPanelRef.current && !dailyPanelRef.current.contains(e.target as Node)) {
        setSelectedDay(null);
      }
    };
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [selectedDay]);

  useEffect(() => {
    if (!selectedMonth) return;
    const handleClick = (e: MouseEvent) => {
      if (monthlyPanelRef.current && !monthlyPanelRef.current.contains(e.target as Node)) {
        setSelectedMonth(null);
      }
    };
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [selectedMonth]);
  // Daily expenses for current month
  const dailyData = useMemo(() => {
    const now = new Date();
    const cm = currentMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const daily: Record<number, number> = {};

    expenses.forEach((e) => {
      if (e.date.startsWith(cm)) {
        const day = new Date(e.date).getDate();
        daily[day] = (daily[day] || 0) + e.amount;
      }
    });

    const [cy, cmo] = cm.split("-").map(Number);
    const daysInMonth = new Date(cy, cmo, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: `${i + 1}`,
      amount: daily[i + 1] || 0,
    }));
  }, [expenses, currentMonth]);

  const [dailyWindowStart, setDailyWindowStart] = useState(0);
  const [dailyWindowSize, setDailyWindowSize] = useState(7);

  useEffect(() => {
    const update = () => setDailyWindowSize(window.innerWidth < 640 ? 7 : 12);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setDailyWindowStart(0);
  }, [currentMonth]);

  // Auto-select today and scroll window so today is visible
  useEffect(() => {
    const now = new Date();
    const cm = currentMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (cm !== nowKey) {
      hasAutoSelected.current = false;
      return;
    }
    if (hasAutoSelected.current) return;

    const today = now.getDate();
    const size = window.innerWidth < 640 ? 7 : 12;
    const maxStart = Math.max(0, dailyData.length - size);
    const start = Math.max(0, Math.min(today - size, maxStart));

    const todayAmount = dailyData.find((d) => d.day === String(today))?.amount || 0;
    setSelectedDay({ day: today, amount: todayAmount });
    setDailyWindowStart(start);
    hasAutoSelected.current = true;
  }, [currentMonth, dailyData]);

  const maxDailyStart = Math.max(0, dailyData.length - dailyWindowSize);
  const safeDailyStart = Math.min(dailyWindowStart, maxDailyStart);
  const visibleDailyData = dailyData.slice(safeDailyStart, safeDailyStart + dailyWindowSize);
  const dailyStartDay = safeDailyStart + 1;
  const dailyEndDay = Math.min(dailyData.length, safeDailyStart + dailyWindowSize);

  // Monthly totals: combine history (closed months) + current month from expenses
  const monthlyData = useMemo(() => {
    const monthly: Record<string, number> = {};
    const salaries: Record<string, number> = {};
    // Closed months from history
    history.forEach((h) => {
      monthly[h.month] = h.total_expenses;
      if (h.salary) salaries[h.month] = h.salary;
    });
    // Current/active month from live expenses
    expenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      monthly[key] = (monthly[key] || 0) + e.amount;
    });
    if (currentMonth && salary) salaries[currentMonth] = salary;

    const keys = Object.keys(monthly).sort();
    return keys.map((key) => {
      const [yr, mo] = key.split("-");
      const shortYr = yr.slice(-2);
      const amount = monthly[key];
      const monthSalary = salaries[key] || 0;
      const over = monthSalary > 0 ? Math.max(0, amount - monthSalary) : 0;
      return {
        key,
        month: `${BN_MONTHS_FULL[parseInt(mo, 10) - 1]},${toBnDigits(shortYr)}`,
        amount,
        within: amount - over,
        over,
        salary: monthSalary,
        isCurrent: key === currentMonth,
      };
    });
  }, [expenses, history, currentMonth, salary]);

  // Group by category
  const categoryData = useMemo(() => {
    const cats: Record<string, { key: string; name: string; emoji: string; value: number; items: Expense[] }> = {};
    expenses.forEach((e) => {
      const k = e.category || DEFAULT_CATEGORY;
      const meta = getCategoryMeta(k);
      if (!cats[k]) cats[k] = { key: k, name: meta.label, emoji: meta.emoji, value: 0, items: [] };
      cats[k].value += e.amount;
      cats[k].items.push(e);
    });
    return Object.values(cats).sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (expenses.length === 0 && history.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-md px-3 py-2 shadow-md">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">৳{payload[0].value.toLocaleString("bn-BD")}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden border-border/60 shadow-elegant gradient-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gradient-primary">খরচের বিশ্লেষণ</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full" onValueChange={onTabChange}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="daily" className="text-xs">দৈনিক</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">মাসিক</TabsTrigger>
            <TabsTrigger value="category" className="text-xs">খাতওয়ারী</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                disabled={safeDailyStart === 0}
                onClick={() => setDailyWindowStart((p) => Math.max(0, p - dailyWindowSize))}
                className="flex items-center gap-0.5 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>পূর্ববর্তী</span>
              </button>
              <span className="text-xs font-medium text-foreground">
                {toBnDigits(dailyStartDay)} - {toBnDigits(dailyEndDay)}
              </span>
              <button
                type="button"
                disabled={safeDailyStart >= maxDailyStart}
                onClick={() => setDailyWindowStart((p) => Math.min(maxDailyStart, p + dailyWindowSize))}
                className="flex items-center gap-0.5 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors"
              >
                <span>পরবর্তী</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={visibleDailyData}>
                <defs>
                  <linearGradient id="dailyBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="amount"
                  fill="url(#dailyBar)"
                  radius={[6, 6, 0, 0]}
                  style={{ cursor: "pointer" }}
                  onClick={(data: any) => {
                    const day = parseInt(data.day, 10);
                    setSelectedDay((prev) => (prev?.day === day ? null : { day, amount: data.amount }));
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
            {selectedDay && (() => {
              const cm = currentMonth ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
              const [yr, mo] = cm.split("-");
              const dayStr = String(selectedDay.day).padStart(2, "0");
              const fullDate = `${cm}-${dayStr}`;
              const dayExpenses = expenses.filter((e) => e.date === fullDate);
              const dayCats: Record<string, { key: string; name: string; emoji: string; value: number }> = {};
              dayExpenses.forEach((e) => {
                const k = e.category || DEFAULT_CATEGORY;
                const meta = getCategoryMeta(k);
                if (!dayCats[k]) dayCats[k] = { key: k, name: meta.label, emoji: meta.emoji, value: 0 };
                dayCats[k].value += e.amount;
              });
              const dayCatList = Object.values(dayCats).sort((a, b) => b.value - a.value);
              return (
                <div ref={dailyPanelRef} className="mt-3 rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {toBnDigits(selectedDay.day)} {BN_MONTHS_FULL[parseInt(mo, 10) - 1]}, {toBnDigits(yr)}
                    </span>
                    <span className="text-sm font-bold text-foreground">৳{selectedDay.amount.toLocaleString("bn-BD")}</span>
                  </div>
                  {dayCatList.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {dayCatList.map((cat) => (
                        <div key={cat.key} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="shrink-0">{cat.emoji}</span>
                            <span className="text-foreground truncate">{cat.name}</span>
                          </div>
                          <span className="font-medium text-foreground whitespace-nowrap">৳{cat.value.toLocaleString("bn-BD")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">এই দিনে কোনো খরচ নেই</p>
                  )}
                </div>
              );
            })()}
            <p className="text-[10px] text-muted-foreground mt-2 text-center">বার এ ক্লিক করে দিনের খাতওয়ারী বিস্তারিত দেখুন</p>
            {onDeleteExpense && expenses.length > 0 && (
              <div className="mt-4">
                <ExpenseList
                  expenses={expenses}
                  onDelete={onDeleteExpense}
                  onEdit={onEditExpense}
                  salary={salary}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly">
            {monthlyData.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">কোনো ডেটা নেই</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 24, right: 5, left: 0, bottom: 5 }} barCategoryGap="35%">
                    <defs>
                      <linearGradient id="monthlyBarActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(210, 90%, 55%)" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(210, 90%, 45%)" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="monthlyBarPast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(215, 25%, 55%)" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="hsl(215, 25%, 45%)" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={45} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                    <Bar
                      dataKey="amount"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={22}
                      onClick={(data: any) => {
                        const found = monthlyData.find((m) => m.month === data.month);
                        if (found) setSelectedMonth(found.key);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <LabelList
                        dataKey="amount"
                        position="top"
                        formatter={(v: number) => `৳${v.toLocaleString("bn-BD")}`}
                        style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 700 }}
                      />
                      {monthlyData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.isCurrent ? "url(#monthlyBarActive)" : "url(#monthlyBarPast)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {selectedMonth && (() => {
                  const monthEntry = monthlyData.find((m) => m.key === selectedMonth);
                  if (!monthEntry) return null;
                  const src = allExpenses || expenses;
                  const monthExpenses = src.filter((e) => e.date.startsWith(selectedMonth));
                  const monthCats: Record<string, { key: string; name: string; emoji: string; value: number }> = {};
                  monthExpenses.forEach((e) => {
                    const k = e.category || DEFAULT_CATEGORY;
                    const meta = getCategoryMeta(k);
                    if (!monthCats[k]) monthCats[k] = { key: k, name: meta.label, emoji: meta.emoji, value: 0 };
                    monthCats[k].value += e.amount;
                  });
                  const monthCatList = Object.values(monthCats).sort((a, b) => b.value - a.value);
                  const totalAmount = monthCatList.reduce((s, c) => s + c.value, 0);
                  return (
                    <div ref={monthlyPanelRef} className="mt-3 rounded-md border bg-muted/40 px-3 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{monthEntry.month}</span>
                        <span className="text-sm font-bold text-foreground">৳{monthEntry.amount.toLocaleString("bn-BD")}</span>
                      </div>
                      {monthCatList.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {monthCatList.map((cat) => (
                            <div key={cat.key} className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => setOpenMonthCat(openMonthCat === cat.key ? null : cat.key)}
                                className="flex items-center justify-between text-xs w-full py-0.5 hover:bg-muted/50 rounded"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="shrink-0">{cat.emoji}</span>
                                  <span className="text-foreground truncate">{cat.name}</span>
                                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform shrink-0 ${openMonthCat === cat.key ? "rotate-180" : ""}`} />
                                </div>
                                <div className="flex flex-col items-end leading-tight shrink-0">
                                  <span className="font-medium text-foreground whitespace-nowrap">
                                    {toBnDigits(Math.round((cat.value / totalAmount) * 100))}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    ৳{cat.value.toLocaleString("bn-BD")}
                                  </span>
                                </div>
                              </button>
                              {openMonthCat === cat.key && (
                                <div className="mt-1 mb-1 ml-3 pl-2 border-l border-border/60 max-h-48 overflow-y-auto flex flex-col gap-1">
                                  {monthExpenses
                                    .filter((e) => (e.category || DEFAULT_CATEGORY) === cat.key)
                                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                                    .map((e, i) => (
                                      <div key={i} className="flex items-start justify-between gap-2 text-[11px]">
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-foreground truncate">{e.description}</span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {new Date(e.date).toLocaleDateString("bn-BD", { day: "numeric", month: "long" })}
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
                      ) : (
                        <p className="text-xs text-muted-foreground">এই মাসের বিস্তারিত খরচের তথ্য নেই</p>
                      )}
                    </div>
                  );
                })()}
                <p className="text-[10px] text-muted-foreground mt-2 text-center">বার এ ক্লিক করে মাসের পরিমাণ দেখুন</p>
              </>
            )}
          </TabsContent>

          <TabsContent value="category">
            <div className="flex flex-col items-center">
              {categoryData.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">এখনো কোনো খরচ যোগ হয়নি — নিচে টার্গেট সেট করতে পারেন</p>
              ) : (() => {
                const totalCat = categoryData.reduce((s, c) => s + c.value, 0);
                return (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    {GRADIENTS.map(([from, to], i) => (
                      <linearGradient key={i} id={`pieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={from} />
                        <stop offset="100%" stopColor={to} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={categoryData.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {categoryData.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={`url(#pieGrad-${i % GRADIENTS.length})`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `৳${value.toLocaleString("bn-BD")}`} />
                </PieChart>
              </ResponsiveContainer>
                );
              })()}
              <div className="w-full mt-3 flex flex-col gap-1.5">
                {(() => {
                  const extraKeys = [
                    ...EXPENSE_CATEGORIES.map((c) => c.key),
                    ...Object.keys(targets),
                  ].filter((k, idx, arr) => arr.indexOf(k) === idx && !categoryData.some((c) => c.key === k));
                  const extra = extraKeys.map((k) => {
                    const meta = getCategoryMeta(k);
                    return { key: k, name: meta.label, emoji: meta.emoji, value: 0, items: [] as Expense[] };
                  });
                  return [...categoryData, ...extra];
                })().map((item, i) => {
                  const target = targets[item.key] ?? 0;
                  const remaining = target - item.value;
                  const usedPct = target > 0 ? Math.min(100, (item.value / target) * 100) : 0;
                  const leftPct = Math.max(0, 100 - usedPct);
                  const over = target > 0 && item.value > target;
                  const barColor = over
                    ? "hsl(0, 75%, 55%)"
                    : leftPct > 50
                      ? "hsl(160, 65%, 45%)"
                      : leftPct > 20
                        ? "hsl(38, 95%, 52%)"
                        : "hsl(15, 85%, 55%)";
                  return (
                  <div key={item.key} className="rounded-md bg-muted/40 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenCategory(openCategory === item.key ? null : item.key)}
                      className="w-full flex items-center justify-between gap-2 text-xs px-2 py-1.5 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="shrink-0">{item.emoji}</span>
                        <span className="text-foreground font-semibold truncate text-left">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">({toBnDigits(item.items.length)})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end leading-tight">
                          <span className="font-bold text-foreground whitespace-nowrap">৳{item.value.toLocaleString("bn-BD")}</span>
                          {salary ? (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {toBnDigits(Math.round((item.value / salary) * 100))}%
                            </span>
                          ) : null}
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${openCategory === item.key ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {/* Target + progress */}
                    <div className="px-2 pb-2 pt-0.5">
                      {editTargetCat === item.key ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            autoFocus
                            value={targetInput}
                            onChange={(e) => setTargetInput(e.target.value)}
                            placeholder="টার্গেট (৳)"
                            className="h-7 text-xs"
                          />
                          <Button
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={async () => {
                              await setTarget(item.key, Number(targetInput) || 0);
                              setEditTargetCat(null);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => setEditTargetCat(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          {target > 0 && (
                            <>
                              {/* Segmented target vs actual bar */}
                              {(() => {
                                const segTotal = 10;
                                const pctLeft = over ? 0 : Math.round(leftPct);
                                const filled = Math.round((pctLeft / 100) * segTotal);
                                const segColor = pctLeft <= 20 ? "hsl(0, 78%, 52%)" : "hsl(150, 62%, 40%)";
                                return (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <div className="flex flex-1 gap-[2px]">
                                      {Array.from({ length: segTotal }).map((_, si) => (
                                        <span
                                          key={si}
                                          className="h-2.5 flex-1 rounded-[2px] transition-colors duration-500"
                                          style={
                                            si < filled
                                              ? { background: segColor }
                                              : {
                                                  background: `repeating-linear-gradient(45deg, ${segColor}55 0 2px, transparent 2px 4px)`,
                                                }
                                          }
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[10px] font-bold shrink-0" style={{ color: segColor }}>
                                      {toBnDigits(pctLeft)}%
                                    </span>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                          <div className="flex items-center gap-3 text-[10px] mt-1.5">
                            <button
                              type="button"
                              onClick={() => { setEditTargetCat(item.key); setTargetInput(target ? String(target) : ""); }}
                              className="flex items-center gap-1 font-semibold text-foreground hover:opacity-80 transition-opacity"
                            >
                              <Target className="h-3 w-3" />
                              {target > 0 ? `টার্গেট ৳${target.toLocaleString("bn-BD")}` : "টার্গেট সেট করুন"}
                            </button>
                            {target > 0 && (
                              <span className={`font-bold ${over ? "text-destructive" : "text-foreground"}`}>
                                {over
                                  ? `৳${Math.abs(remaining).toLocaleString("bn-BD")} বেশি`
                                  : `৳${remaining.toLocaleString("bn-BD")} বাকি`}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {openCategory === item.key && (
                      <div className="border-t border-border/40 bg-background/50 divide-y divide-border/30">
                        {item.items
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((it) => (
                            <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                              <div className="flex flex-col min-w-0">
                                <span className="text-foreground truncate">{it.description}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(it.date).toLocaleDateString("bn-BD", { day: "numeric", month: "long" })}
                                </span>
                              </div>
                              <span className="font-medium text-foreground shrink-0">৳{it.amount.toLocaleString("bn-BD")}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  );
                })}
                <div className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 mt-1 border-t pt-2">
                  <span className="font-semibold text-muted-foreground">মোট</span>
                  <div className="flex flex-col items-end leading-tight">
                    <span className="font-bold text-destructive">৳{categoryData.reduce((s, c) => s + c.value, 0).toLocaleString("bn-BD")}</span>
                    {salary ? (
                      <span className="text-[10px] text-muted-foreground">
                        {toBnDigits(Math.round((categoryData.reduce((s, c) => s + c.value, 0) / salary) * 100))}%
                      </span>
                    ) : null}
                  </div>
                </div>
                {(() => {
                  const totalTarget = Object.values(targets).reduce((s, v) => s + v, 0);
                  if (totalTarget <= 0) return null;
                  const totalActual = categoryData.reduce((s, c) => s + c.value, 0);
                  const diff = totalTarget - totalActual;
                  return (
                    <div className="rounded-xl border border-border/60 gradient-card shadow-soft p-2.5 mt-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-foreground">মোট টার্গেট</span>
                        <span className="font-bold text-foreground">৳{totalTarget.toLocaleString("bn-BD")}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">প্রকৃত খরচ</span>
                        <span className="font-bold text-destructive">৳{totalActual.toLocaleString("bn-BD")}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t pt-1.5">
                        <span className="text-muted-foreground">{diff >= 0 ? "কম খরচ হয়েছে" : "বেশি খরচ হয়েছে"}</span>
                        <span className={`font-extrabold ${diff >= 0 ? "text-primary" : "text-destructive"}`}>
                          ৳{Math.abs(diff).toLocaleString("bn-BD")}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
