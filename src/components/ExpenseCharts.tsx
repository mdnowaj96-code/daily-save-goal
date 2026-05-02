import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

const COLORS = [
  "hsl(210, 70%, 50%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(38, 90%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(190, 70%, 45%)",
];

const BN_MONTHS = [
  "জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন",
  "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে",
];

export function ExpenseCharts({ expenses, history = [], currentMonth }: ExpenseChartsProps) {
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
      const [, mo] = key.split("-");
      return {
        key,
        month: BN_MONTHS[parseInt(mo, 10) - 1],
        amount: monthly[key],
        isCurrent: key === currentMonth,
      };
    });
  }, [expenses, history, currentMonth]);

  // Top expense categories (by description)
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e) => {
      cats[e.description] = (cats[e.description] || 0) + e.amount;
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">খরচের বিশ্লেষণ</CardTitle>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="monthly">
            {monthlyData.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">কোনো ডেটা নেই</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 10, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={45} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                    <Bar
                      dataKey="amount"
                      radius={[4, 4, 0, 0]}
                      onClick={(data: any) => setSelectedMonth({ month: data.month, amount: data.amount })}
                      style={{ cursor: "pointer" }}
                    >
                      {monthlyData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                          fillOpacity={entry.isCurrent ? 1 : 0.6}
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
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `৳${value.toLocaleString("bn-BD")}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
