import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseList } from "@/components/ExpenseList";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
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
  onEditExpense?: (id: string, date: string, description: string, amount: number) => void | Promise<void>;
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

export function ExpenseCharts({ expenses, history = [], currentMonth, onDeleteExpense, onEditExpense }: ExpenseChartsProps) {
  const [selectedMonth, setSelectedMonth] = useState<{ month: string; amount: number } | null>(null);
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

  // Group by the exact description the user typed (case-insensitive, whitespace-normalized).
  // Display key preserves original casing of the first occurrence.
  const categoryData = useMemo(() => {
    const cats: Record<string, { name: string; value: number }> = {};
    expenses.forEach((e) => {
      const normalized = e.description.trim().replace(/\s+/g, " ");
      const key = normalized.toLowerCase();
      if (!cats[key]) cats[key] = { name: normalized, value: 0 };
      cats[key].value += e.amount;
    });
    return Object.values(cats)
      .sort((a, b) => b.value - a.value);
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
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="daily" className="text-xs">দৈনিক</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">মাসিক</TabsTrigger>
            <TabsTrigger value="category" className="text-xs">খাতওয়ারী</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <defs>
                  <linearGradient id="dailyBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="url(#dailyBar)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {onDeleteExpense && expenses.length > 0 && (
              <div className="mt-4">
                <ExpenseList
                  expenses={expenses}
                  onDelete={onDeleteExpense}
                  onEdit={onEditExpense}
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
                      onClick={(data: any) => setSelectedMonth({ month: data.month, amount: data.amount })}
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
                {selectedMonth && (
                  <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{selectedMonth.month}</span>
                    <span className="text-sm font-bold text-foreground">৳{selectedMonth.amount.toLocaleString("bn-BD")}</span>
                  </div>
                )}
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
                  <div key={item.name} className="flex items-start justify-between gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/40">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-foreground break-words whitespace-normal leading-snug">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground shrink-0 whitespace-nowrap">৳{item.value.toLocaleString("bn-BD")}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 mt-1 border-t pt-2">
                  <span className="font-semibold text-muted-foreground">মোট</span>
                  <span className="font-bold text-destructive">৳{categoryData.reduce((s, c) => s + c.value, 0).toLocaleString("bn-BD")}</span>
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
