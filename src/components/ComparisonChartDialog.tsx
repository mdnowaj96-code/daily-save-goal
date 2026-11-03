import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ComparisonChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: { date: string; amount: number; month: string }[];
  currentMonth: string;
  history: { month: string; total_expenses: number }[];
}

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

const bnNumber = (v: number, fractionDigits = 0) =>
  v.toLocaleString("bn-BD", { maximumFractionDigits: fractionDigits });

const formatMoney = (value: number) => `৳${bnNumber(Math.round(value))}`;

const monthLabel = (month: string) => {
  const [, mo] = month.split("-").map(Number);
  return BN_MONTHS[(mo ?? 1) - 1] ?? month;
};

const shiftMonth = (month: string, delta: number) => {
  const [y, mo] = month.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type RangeKey = 7 | 15 | 30;

interface TooltipPayloadItem {
  value?: number | string;
  dataKey?: string | number;
  payload?: ChartPoint;
}

interface ChartPoint {
  day: number;
  current: number;
  previous: number;
  prevDay: number;
}

const ComparisonTooltip = ({
  active,
  payload,
  currentLabel,
  previousLabel,
  currentMonth,
  compareMonth,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  currentLabel: string;
  previousLabel: string;
  currentMonth: string;
  compareMonth: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as ChartPoint;
  const current = point.current ?? 0;
  const previous = point.previous ?? 0;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return (
    <div className="rounded-xl border border-border/70 bg-popover p-3 shadow-elegant">
      <p className="text-xs font-bold text-foreground">
        {bnNumber(point.day)} {monthLabel(currentMonth)}
      </p>
      <div className="mt-1.5 flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-budget-safe" />
          {currentLabel}: {formatMoney(current)}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-budget-danger" />
          {previousLabel}: {formatMoney(previous)}
        </span>
        {change !== null && (
          <span className="mt-1 flex items-center gap-2">
            <span className="text-muted-foreground">পার্থক্য:</span>
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground", change <= 0 ? "badge-down" : "badge-up")}>
              {change <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {bnNumber(Math.abs(change), 1)}%
            </span>
          </span>
        )}
      </div>
      <span className="sr-only">{monthLabel(compareMonth)} তুলনা</span>
    </div>
  );
};

export function ComparisonChartDialog({
  open,
  onOpenChange,
  expenses,
  currentMonth,
  history,
}: ComparisonChartDialogProps) {
  const [range, setRange] = useState<RangeKey>(30);
  const [focus, setFocus] = useState<"current" | "previous">("current");

  const dailyByMonth = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    for (const e of expenses) {
      const key = e.month || e.date.slice(0, 7);
      const day = parseInt(e.date.slice(8, 10), 10);
      if (!key || Number.isNaN(day)) continue;
      map[key] = map[key] ?? {};
      map[key][day] = (map[key][day] ?? 0) + e.amount;
    }
    return map;
  }, [expenses]);

  const compareMonth = useMemo(() => {
    const withData = new Set<string>([...Object.keys(dailyByMonth), ...history.map((h) => h.month)]);
    const candidates = [...withData].filter((m) => m < currentMonth).sort();
    return candidates[candidates.length - 1] ?? shiftMonth(currentMonth, -1);
  }, [dailyByMonth, history, currentMonth]);

  const curDaily = dailyByMonth[currentMonth] ?? {};
  const prevDaily = dailyByMonth[compareMonth] ?? {};

  const curTotal = useMemo(() => Object.values(curDaily).reduce((s, v) => s + v, 0), [curDaily]);
  const prevDailyTotal = useMemo(() => Object.values(prevDaily).reduce((s, v) => s + v, 0), [prevDaily]);
  const prevTotal = prevDailyTotal > 0
    ? prevDailyTotal
    : history.find((h) => h.month === compareMonth)?.total_expenses ?? 0;

  const lastDay = useMemo(() => {
    const [yy, mm] = currentMonth.split("-").map(Number);
    const now = new Date();
    const isRealCurrent = now.getFullYear() === yy && now.getMonth() + 1 === mm;
    if (isRealCurrent) return now.getDate();
    const withData = Object.keys(curDaily).map(Number);
    return withData.length ? Math.max(...withData) : new Date(yy, mm, 0).getDate();
  }, [currentMonth, curDaily]);

  const startDay = Math.max(1, lastDay - range + 1);
  const series = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [];
    for (let d = startDay; d <= lastDay; d++) {
      points.push({
        day: d,
        current: curDaily[d] ?? 0,
        previous: prevDaily[d] ?? 0,
        prevDay: d,
      });
    }
    return points;
  }, [startDay, lastDay, curDaily, prevDaily]);

  const change = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null;
  const focusIsCurrent = focus === "current";
  const focusLabel = focusIsCurrent ? monthLabel(currentMonth) : monthLabel(compareMonth);
  const otherLabel = focusIsCurrent ? monthLabel(compareMonth) : monthLabel(currentMonth);
  const focusTotal = focusIsCurrent ? curTotal : prevTotal;
  const otherTotal = focusIsCurrent ? prevTotal : curTotal;

  const peak = useMemo(() => {
    const source = focusIsCurrent ? curDaily : prevDaily;
    let bestDay = 0;
    let bestValue = 0;
    for (const [k, v] of Object.entries(source)) {
      if (v > bestValue) {
        bestValue = v;
        bestDay = Number(k);
      }
    }
    return { day: bestDay, value: bestValue };
  }, [focusIsCurrent, curDaily, prevDaily]);

  const hasPrevDaily = Object.keys(prevDaily).length > 0;
  const tickDays = useMemo(() => {
    const ticks: number[] = [];
    for (let d = startDay; d <= lastDay; d += 5) ticks.push(d);
    if (ticks[ticks.length - 1] !== lastDay) ticks.push(lastDay);
    return ticks;
  }, [startDay, lastDay]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg overflow-hidden rounded-2xl p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>খরচের তুলনামূলক চিত্র</DialogTitle>
          <DialogDescription>বর্তমান ও গত মাসের দৈনিক খরচের তুলনা</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-budget-safe to-budget-steady px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <TrendingUp className="h-5 w-5 text-white" />
            </span>
            <h2 className="truncate text-base font-bold text-white sm:text-lg">খরচের তুলনামূলক চিত্র</h2>
          </div>
          <div className="mr-8 flex shrink-0 items-center rounded-full bg-white/15 p-0.5">
            {(["current", "previous"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFocus(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  focus === key ? "bg-white text-budget-safe" : "text-white/90 hover:text-white"
                )}
              >
                {key === "current" ? "এই মাস" : "গত মাস"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className={cn("rounded-xl p-3 transition-shadow", focus === "previous" && "ring-2 ring-budget-danger/50")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-budget-danger">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-budget-danger" />
                    গত মাসের মোট খরচ
                  </p>
                  <p className="truncate text-[10px] font-medium text-muted-foreground">({monthLabel(compareMonth)})</p>
                </div>
              </div>
              <p className="mt-1 break-words text-xl font-bold leading-tight text-budget-danger tabular-nums">{formatMoney(prevTotal)}</p>
            </div>
            <div className={cn("rounded-xl bg-budget-safe/10 p-3 transition-shadow", focus === "current" && "ring-2 ring-budget-safe/50")}>
              <p className="flex items-center gap-1.5 text-xs font-bold text-budget-safe">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-budget-safe" />
                বর্তমান মাসের মোট খরচ
              </p>
              <p className="truncate text-[10px] font-medium text-muted-foreground">({monthLabel(currentMonth)})</p>
              <p className="mt-1 break-words text-xl font-bold leading-tight text-budget-safe tabular-nums">{formatMoney(curTotal)}</p>
              {change !== null && (
                <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground", change <= 0 ? "badge-down" : "badge-up")}>
                  {change <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {bnNumber(Math.abs(change), 1)}%
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="inline-block h-0.5 w-5 rounded-full bg-budget-danger" />
                  গত মাস ({monthLabel(compareMonth)})
                </span>
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="inline-block h-0.5 w-5 rounded-full bg-budget-safe" />
                  বর্তমান মাস ({monthLabel(currentMonth)})
                </span>
              </div>
              <div className="flex items-center gap-1">
                {([7, 15, 30] as RangeKey[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                      range === r ? "bg-budget-safe text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {bnNumber(r)} দিন
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="cmp-cur-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--budget-safe))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--budget-safe))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="cmp-prev-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--budget-danger))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--budget-danger))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="day"
                    type="number"
                    domain={[startDay, lastDay]}
                    ticks={tickDays}
                    tickFormatter={(d: number) => `${bnNumber(d)}`}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => bnNumber(v)}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    content={
                      <ComparisonTooltip
                        currentLabel="বর্তমান মাস"
                        previousLabel="গত মাস"
                        currentMonth={currentMonth}
                        compareMonth={compareMonth}
                      />
                    }
                    cursor={{ stroke: "hsl(var(--primary))", strokeDasharray: "4 4" }}
                  />
                  {hasPrevDaily && (
                    <Area
                      type="monotone"
                      dataKey="previous"
                      stroke="hsl(var(--budget-danger))"
                      strokeWidth={2.2}
                      fill="url(#cmp-prev-fill)"
                      dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--budget-danger))" }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                      connectNulls
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke="hsl(var(--budget-safe))"
                    strokeWidth={2.4}
                    fill="url(#cmp-cur-fill)"
                    dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--budget-safe))" }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-center text-[10px] font-medium text-muted-foreground">
              খরচ (৳) — তারিখ অনুযায়ী দৈনিক তুলনা
            </p>
            {!hasPrevDaily && prevTotal > 0 && (
              <p className="mt-1 text-center text-[10px] font-medium text-budget-warning">
                {monthLabel(compareMonth)} এর দৈনিক তথ্য নেই — মোট খরচ ইতিহাস থেকে দেখানো হয়েছে
              </p>
            )}
          </div>

          <div className="flex items-stretch gap-3 rounded-xl bg-budget-safe/10 p-3.5">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <span aria-hidden className="text-lg leading-none">💡</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-budget-safe">মূল তথ্য</p>
                <p className="mt-0.5 text-xs font-medium leading-relaxed text-foreground">
                  {change === null
                    ? `${focusLabel} মাসের খরচ ${otherLabel} মাসের তুলনায় হিসাব করা যাচ্ছে না।`
                    : focusTotal === otherTotal
                      ? `${focusLabel} মাসের খরচ ${otherLabel} মাসের সমান হয়েছে।`
                      : `${focusLabel} মাসের খরচ ${otherLabel} তুলনায় ${bnNumber(Math.abs(change ?? 0), 1)}% ${change! > 0 ? "বেশি" : "কম"} হয়েছে।`}
                </p>
              </div>
            </div>
            <div className="w-px shrink-0 bg-budget-safe/25" />
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-bold text-budget-safe">সর্বোচ্চ খরচ ({focusLabel})</p>
              <p className="mt-0.5 break-words text-base font-bold leading-tight text-foreground tabular-nums">
                {peak.value > 0 ? formatMoney(peak.value) : "৳0"}
              </p>
              {peak.value > 0 && (
                <p className="text-[10px] font-medium text-muted-foreground">
                  ({bnNumber(peak.day)} {focusLabel})
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
