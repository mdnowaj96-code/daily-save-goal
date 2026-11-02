import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CircleBox } from "@/components/CircleBox";
import { cn } from "@/lib/utils";

interface DashboardSummaryProps {
  monthLabel: string;
  currentMonth: string;
  totalExpenses: number;
  salary: number;
  /** মাসিক বাজেট — খাতওয়ারি টার্গেটের যোগফল (না থাকলে বেতন) */
  budget: number;
  recentDailyExpense: number;
  weekExpense: number;
  dailyAverage: number;
  previousMonthTotal?: number;
  dailyTrend: number[];
  dailyTotals?: Record<string, number>;
  allDailyTotals?: Record<string, number>;
  needs: { amount: number; percent: number; remainingPercent: number; allocation: number; onEdit: (value: number) => void };
  wants: { amount: number; percent: number; remainingPercent: number; allocation: number; onEdit: (value: number) => void };
  savings: { amount: number; percent: number; remainingPercent: number; allocation: number; onEdit: (value: number) => void };
  onSalaryEdit: (value: number) => void;
}

const formatMoney = (value: number) => `৳${Math.round(value).toLocaleString("bn-BD")}`;

export function DashboardSummary({
  monthLabel,
  currentMonth,
  totalExpenses,
  salary,
  budget,
  recentDailyExpense,
  weekExpense,
  dailyAverage,
  previousMonthTotal,
  dailyTrend,
  dailyTotals = {},
  allDailyTotals = {},
  needs,
  wants,
  savings,
  onSalaryEdit,
}: DashboardSummaryProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [monthYear, monthNum] = currentMonth.split("-").map(Number);
  const [viewYear, setViewYear] = useState(monthYear);
  const [viewMonth, setViewMonth] = useState(monthNum - 1);
  const isCurrentView = viewYear === monthYear && viewMonth === monthNum - 1;
  const [selectStart, setSelectStart] = useState<Date | null>(null);
  const [selectEnd, setSelectEnd] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const clearSelection = () => { setSelectStart(null); setSelectEnd(null); setIsSelecting(false); };

  const today = new Date();
  const isToday = (d: Date) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    return cells;
  }, [viewYear, viewMonth]);

  const dayTotal = (d: Date) => {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return (isCurrentView ? dailyTotals[key] : allDailyTotals[key]) ?? 0;
  };

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const selectionTotal = useMemo(() => {
    if (!selectStart || !selectEnd) return 0;
    const lo = Math.min(startOfDay(selectStart), startOfDay(selectEnd));
    const hi = Math.max(startOfDay(selectStart), startOfDay(selectEnd));
    return calendarCells.reduce((sum, cell) => (cell && startOfDay(cell) >= lo && startOfDay(cell) <= hi ? sum + dayTotal(cell) : sum), 0);
  }, [selectStart, selectEnd, calendarCells, dailyTotals, allDailyTotals, isCurrentView]);
  const monthTotal = useMemo(
    () => calendarCells.reduce((sum, cell) => sum + (cell ? dayTotal(cell) : 0), 0),
    [calendarCells, dailyTotals, allDailyTotals, isCurrentView]
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    clearSelection();
  };

  const viewLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
  const weekDays = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];
  const isWeekendColumn = (index: number) => {
    const col = index % 7;
    return col === 5 || col === 6;
  };
  const budgetUsed = budget > 0 ? (totalExpenses / budget) * 100 : totalExpenses > 0 ? 101 : 0;
  const remainingBudget = Math.max(0, budget - totalExpenses);
  const comparison = previousMonthTotal && previousMonthTotal > 0
    ? ((totalExpenses - previousMonthTotal) / previousMonthTotal) * 100
    : null;

  const budgetStatus = budgetUsed > 100
    ? { color: "bg-budget-over", text: "text-budget-over", soft: "bg-budget-over/10", label: "বাজেট অতিক্রম" }
    : budgetUsed > 90
      ? { color: "bg-budget-danger", text: "text-budget-danger", soft: "bg-budget-danger/10", label: "সীমার কাছাকাছি" }
      : budgetUsed > 75
        ? { color: "bg-budget-warning", text: "text-budget-warning", soft: "bg-budget-warning/10", label: "সতর্ক থাকুন" }
        : budgetUsed > 50
          ? { color: "bg-budget-steady", text: "text-budget-steady", soft: "bg-budget-steady/10", label: "নিয়ন্ত্রিত" }
          : { color: "bg-budget-safe", text: "text-budget-safe", soft: "bg-budget-safe/10", label: "ভালো অবস্থায়" };

  const { sparklinePath, sparklineArea, sparklineEnd } = useMemo(() => {
    const base = dailyTrend.length ? dailyTrend : [0, 0];
    const values = base.length === 1 ? [base[0], base[0]] : base;
    const max = Math.max(...values, 1);
    const pts = values.map((value, index) => ({
      x: (index / (values.length - 1)) * 100,
      y: 34 - (value / max) * 28,
    }));
    // Catmull-Rom → cubic bezier for a smooth, wavy trading-style curve
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    const last = pts[pts.length - 1];
    const area = `${d} L ${last.x.toFixed(2)} 38 L ${pts[0].x.toFixed(2)} 38 Z`;
    return { sparklinePath: d, sparklineArea: area, sparklineEnd: last };
  }, [dailyTrend]);

  const goToSlide = (index: number) => {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollTo({ left: slider.clientWidth * index, behavior: "smooth" });
    setActiveSlide(index);
  };

  return (
    <section aria-label="মাসিক বাজেট সারাংশ" className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elegant">
      <div
        ref={sliderRef}
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth;
          if (width > 0) setActiveSlide(Math.round(event.currentTarget.scrollLeft / width));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
      >
        <div className="min-w-full snap-center p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">মাসিক সারাংশ</p>
              <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
            </div>
            <button
              type="button"
              onClick={() => { setViewYear(monthYear); setViewMonth(monthNum - 1); clearSelection(); setCalendarOpen(true); }}
              aria-label="মাসের ক্যালেন্ডার দেখুন"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary transition-colors hover:bg-primary/10"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 overflow-hidden rounded-xl bg-summary p-5 text-primary-foreground shadow-glow">
              <p className="text-sm font-medium text-primary-foreground/80">এই মাসের মোট খরচ</p>
              <p className="mt-1 break-words text-3xl font-bold leading-tight tabular-nums">{formatMoney(totalExpenses)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {comparison === null ? (
                  <span className="badge-pill rounded-full px-3 py-1 text-xs font-bold text-primary-foreground">চলতি মাসের হিসাব</span>
                ) : (
                  <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground", comparison <= 0 ? "badge-down" : "badge-up")}>
                    {comparison <= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                    {Math.abs(comparison).toLocaleString("bn-BD", { maximumFractionDigits: 1 })}%
                  </span>
                )}
                {comparison !== null && <span className="text-xs font-medium text-primary-foreground/80">গত মাসের তুলনায়</span>}
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-border/60 bg-muted/35 p-3.5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-budget-safe/10 text-budget-safe">
                <WalletCards className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">সর্বশেষ দৈনিক খরচ</p>
              <p className="mt-1 break-words text-lg font-bold leading-tight text-foreground tabular-nums">{formatMoney(recentDailyExpense)}</p>
              <svg viewBox="0 0 100 38" className="mt-2 h-9 w-full overflow-visible" role="img" aria-label="সাম্প্রতিক দৈনিক খরচের রেখাচিত্র">
                <defs>
                  <linearGradient id="daily-spark-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--budget-steady))" />
                    <stop offset="100%" stopColor="hsl(var(--budget-safe))" />
                  </linearGradient>
                  <linearGradient id="daily-spark-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--budget-safe))" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="hsl(var(--budget-safe))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sparklineArea} fill="url(#daily-spark-fill)" />
                <path d={sparklinePath} fill="none" stroke="url(#daily-spark-line)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={sparklineEnd.x} cy={sparklineEnd.y} r="4.6" fill="hsl(var(--budget-safe))" opacity="0.3">
                  <animate attributeName="r" values="3.4;5.8;3.4" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0.08;0.35" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={sparklineEnd.x} cy={sparklineEnd.y} r="2" fill="hsl(var(--budget-safe))" stroke="hsl(var(--card))" strokeWidth="0.8" />
              </svg>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">এই সপ্তাহে {formatMoney(weekExpense)}</p>
            </div>

            <div className="min-w-0 rounded-xl border border-border/60 bg-muted/35 p-3.5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">মাসিক বাজেট অবশিষ্ট</p>
              <p className={cn("mt-1 break-words text-lg font-bold leading-tight tabular-nums", totalExpenses > budget && budget > 0 ? "text-budget-over" : "text-foreground")}>{formatMoney(remainingBudget)}</p>
              <p className="mt-2 text-[10px] font-medium text-muted-foreground">দৈনিক গড় {formatMoney(dailyAverage)}</p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">মোট বাজেট {formatMoney(budget)}</p>
            </div>

            <div className="col-span-2 rounded-xl border border-border/60 bg-muted/35 p-4">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">বাজেট ব্যবহার</p>
                  <p className="text-sm font-bold text-foreground">{budgetUsed.toLocaleString("bn-BD", { maximumFractionDigits: 1 })}% ব্যবহৃত হয়েছে</p>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] font-bold", budgetStatus.soft, budgetStatus.text)}>{budgetStatus.label}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all duration-700", budgetStatus.color)} style={{ width: `${Math.min(100, budgetUsed)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                <span>খরচ {formatMoney(totalExpenses)}</span>
                <span>বাজেট {formatMoney(budget)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-full snap-center p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground">বাজেট বিভাজন</p>
            <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 justify-items-center">
            <CircleBox label="মোট বেতন" amount={salary} colorVar="salary" percent={100} onEdit={onSalaryEdit} />
            <CircleBox label="প্রয়োজন" amount={needs.amount} percent={needs.percent} remainingPercent={needs.remainingPercent} colorVar="needs" onEdit={needs.onEdit} subtitle={`বরাদ্দ: ${formatMoney(needs.allocation)}`} />
            <CircleBox label="হাত খরচ" amount={wants.amount} percent={wants.percent} remainingPercent={wants.remainingPercent} colorVar="wants" onEdit={wants.onEdit} subtitle={`বরাদ্দ: ${formatMoney(wants.allocation)}`} />
            <CircleBox label="সঞ্চয়" amount={savings.amount} percent={savings.percent} remainingPercent={savings.remainingPercent} colorVar="savings" onEdit={savings.onEdit} subtitle={`বরাদ্দ: ${formatMoney(savings.allocation)}`} />
          </div>
        </div>
      </div>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-bold text-foreground">মাসের ক্যালেন্ডার</DialogTitle>
            <DialogDescription className="text-left">
              দিনভিত্তিক খরচ দেখুন — টেনে কয়েক দিন নির্বাচন করলে সেই দিনগুলোর মোট খরচ নিচে দেখা যাবে
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-2 py-1.5">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="আগের মাস" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-base font-bold text-primary">{viewLabel}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="পরের মাস" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div
            className="mt-3 grid grid-cols-7 gap-1 text-center select-none touch-none"
            onPointerUp={() => setIsSelecting(false)}
            onPointerCancel={() => setIsSelecting(false)}
          >
            {weekDays.map((w, idx) => (
              <span key={w} className={cn("pb-1 text-[11px] font-semibold", isWeekendColumn(idx) ? "text-budget-danger" : "text-muted-foreground")}>{w}</span>
            ))}
            {calendarCells.map((cell, i) => {
              if (!cell) return <span key={`e-${i}`} />;
              const total = dayTotal(cell);
              const current = isToday(cell) && isCurrentView;
              const inRange = selectStart && selectEnd
                ? startOfDay(cell) >= Math.min(startOfDay(selectStart), startOfDay(selectEnd)) &&
                  startOfDay(cell) <= Math.max(startOfDay(selectStart), startOfDay(selectEnd))
                : false;
              return (
                <div
                  key={cell.toISOString()}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                    setSelectStart(cell);
                    setSelectEnd(cell);
                    setIsSelecting(true);
                  }}
                  onPointerEnter={() => { if (isSelecting) setSelectEnd(cell); }}
                  className={cn(
                    "flex min-h-[52px] flex-col items-center justify-start rounded-xl py-1.5",
                    current ? "bg-primary text-primary-foreground" : inRange ? "bg-primary/15 ring-1 ring-primary/40" : total > 0 ? "bg-muted/60" : ""
                  )}
                >
                  <span className={cn("text-sm font-bold leading-tight", current ? "text-primary-foreground" : inRange ? "text-primary" : isWeekendColumn(i) ? "text-budget-danger" : "text-foreground")}>
                    {cell.getDate().toLocaleString("bn-BD")}
                  </span>
                  {total > 0 && (
                    <span className={cn("text-[9px] font-semibold leading-tight", current ? "text-primary-foreground/90" : inRange ? "text-primary" : isWeekendColumn(i) ? "text-budget-danger" : "text-primary")}>
                      {formatMoney(total)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl bg-muted/50 p-3">
            {selectStart && selectEnd ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-muted-foreground">নির্বাচিত দিনের মোট খরচ</p>
                  <p className="mt-0.5 break-words text-lg font-bold leading-tight text-primary tabular-nums">{formatMoney(selectionTotal)}</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={clearSelection}>
                  নির্বাচন মুছুন
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground">{viewLabel} মোট খরচ</p>
                <p className="text-lg font-bold text-primary tabular-nums">{formatMoney(monthTotal)}</p>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
            যেদিন খরচ হয়েছে
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-center gap-1.5 pb-4" aria-label="সারাংশ প্যানেল নির্বাচন">
        {[0, 1].map((index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-8 p-0 hover:bg-transparent"
            onClick={() => goToSlide(index)}
            aria-label={index === 0 ? "মাসিক সারাংশ দেখুন" : "চারটি বাজেট সার্কেল দেখুন"}
          >
            <span className={cn("h-1.5 rounded-full transition-all", activeSlide === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30")} />
          </Button>
        ))}
      </div>
    </section>
  );
}