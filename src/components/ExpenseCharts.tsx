import { useMemo, useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseList } from "@/components/ExpenseList";
import { EXPENSE_CATEGORIES, DEFAULT_CATEGORY, getCategoryMeta } from "@/lib/expenseCategories";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; amount: number } | null>(null);
  const dailyPanelRef = useRef<HTMLDivElement>(null);
  const monthlyPanelRef = useRef<HTMLDivElement>(null);

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

  const maxDailyStart = Math.max(0, dailyData.length - dailyWindowSize);
  const safeDailyStart = Math.min(dailyWindowStart, maxDailyStart);
  const visibleDailyData = dailyData.slice(safeDailyStart, safeDailyStart + dailyWindowSize);
  const dailyStartDay = safeDailyStart + 1;
  const dailyEndDay = Math.min(dailyData.length, safeDailyStart + dailyWindowSize);

  // Monthly totals: combine history (closed months) + current month from expenses
  const monthlyData = useMemo(() => {
    const monthly: Record<string, number> = {};
    // Closed months from history
    history.forEach((h) => {
      monthly[h.month] = h.total_expenses;
    });
    // Current/active month from live expenses
    expenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      monthly[key] = (monthly[key] || 0) + e.amount;
    });

    const keys = Object.keys(monthly).sort();
    return keys.map((key) => {
      const [yr, mo] = key.split("-");
      const shortYr = yr.slice(-2);
      return {
        key,
        month: `${BN_MONTHS_FULL[parseInt(mo, 10) - 1]},${toBnDigits(shortYr)}`,
        amount: monthly[key],
        isCurrent: key === currentMonth,
      };
    });
  }, [expenses, history, currentMonth]);

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
                            <div key={cat.key} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0">{cat.emoji}</span>
                                <span className="text-foreground truncate">{cat.name}</span>
                              </div>
                              <div className="flex flex-col items-end leading-tight shrink-0">
                                <span className="font-medium text-foreground whitespace-nowrap">
                                  {toBnDigits(Math.round((cat.value / totalAmount) * 100))}%
                                </span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  ৳{cat.value.toLocaleString("bn-BD")}
                                </span>
                              </div>
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
            {categoryData.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">কোনো ডেটা নেই</p>
            ) : (
            <div className="flex flex-col items-center">
              {(() => {
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
                {categoryData.map((item, i) => (
                  <div key={item.key} className="rounded-md bg-muted/40 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenCategory(openCategory === item.key ? null : item.key)}
                      className="w-full flex items-center justify-between gap-2 text-xs px-2 py-1.5 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="shrink-0">{item.emoji}</span>
                        <span className="text-foreground truncate text-left">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">({toBnDigits(item.items.length)})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end leading-tight">
                          <span className="font-semibold text-foreground whitespace-nowrap">৳{item.value.toLocaleString("bn-BD")}</span>
                          {salary ? (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {toBnDigits(Math.round((item.value / salary) * 100))}%
                            </span>
                          ) : null}
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${openCategory === item.key ? "rotate-180" : ""}`} />
                      </div>
                    </button>
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
                ))}
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
              </div>
            </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
