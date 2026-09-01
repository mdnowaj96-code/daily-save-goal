import { useMemo, useRef, useState } from "react";
import { CalendarDays, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircleBox } from "@/components/CircleBox";
import { cn } from "@/lib/utils";

interface DashboardSummaryProps {
  monthLabel: string;
  totalExpenses: number;
  salary: number;
  recentDailyExpense: number;
  weekExpense: number;
  dailyAverage: number;
  previousMonthTotal?: number;
  dailyTrend: number[];
  needs: { amount: number; percent: number; remainingPercent: number; allocation: number; onEdit: (value: number) => void };
  wants: { amount: number; percent: number; remainingPercent: number; allocation: number; onEdit: (value: number) => void };
  savings: { amount: number; percent: number; remainingPercent: number; allocation: number; onEdit: (value: number) => void };
  onSalaryEdit: (value: number) => void;
}

const formatMoney = (value: number) => `৳${Math.round(value).toLocaleString("bn-BD")}`;

export function DashboardSummary({
  monthLabel,
  totalExpenses,
  salary,
  recentDailyExpense,
  weekExpense,
  dailyAverage,
  previousMonthTotal,
  dailyTrend,
  needs,
  wants,
  savings,
  onSalaryEdit,
}: DashboardSummaryProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const budgetUsed = salary > 0 ? (totalExpenses / salary) * 100 : 0;
  const remainingBudget = Math.max(0, salary - totalExpenses);
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

  const sparklinePoints = useMemo(() => {
    const values = dailyTrend.length ? dailyTrend : [0, 0];
    const max = Math.max(...values, 1);
    return values.map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 34 - (value / max) * 28;
      return `${x},${y}`;
    }).join(" ");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary" aria-hidden="true">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 overflow-hidden rounded-xl bg-summary p-5 text-primary-foreground shadow-glow">
              <p className="text-sm font-medium text-primary-foreground/80">এই মাসের মোট খরচ</p>
              <p className="mt-1 break-words text-3xl font-bold leading-tight tabular-nums">{formatMoney(totalExpenses)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {comparison === null ? (
                  <span className="rounded-md bg-primary-foreground/15 px-2.5 py-1 text-xs font-semibold">চলতি মাসের হিসাব</span>
                ) : (
                  <span className="flex items-center gap-1 rounded-md bg-primary-foreground/15 px-2.5 py-1 text-xs font-semibold">
                    {comparison <= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                    {Math.abs(comparison).toLocaleString("bn-BD", { maximumFractionDigits: 1 })}%
                  </span>
                )}
                {comparison !== null && <span className="text-xs text-primary-foreground/75">গত মাসের তুলনায়</span>}
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-border/60 bg-muted/35 p-3.5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-budget-safe/10 text-budget-safe">
                <WalletCards className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">সর্বশেষ দৈনিক খরচ</p>
              <p className="mt-1 break-words text-lg font-bold leading-tight text-foreground tabular-nums">{formatMoney(recentDailyExpense)}</p>
              <svg viewBox="0 0 100 38" className="mt-2 h-8 w-full text-budget-safe" role="img" aria-label="সাম্প্রতিক দৈনিক খরচের রেখাচিত্র">
                <polyline points={sparklinePoints} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">এই সপ্তাহে {formatMoney(weekExpense)}</p>
            </div>

            <div className="min-w-0 rounded-xl border border-border/60 bg-muted/35 p-3.5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">মাসিক বাজেট অবশিষ্ট</p>
              <p className={cn("mt-1 break-words text-lg font-bold leading-tight tabular-nums", totalExpenses > salary && salary > 0 ? "text-budget-over" : "text-foreground")}>{formatMoney(remainingBudget)}</p>
              <p className="mt-2 text-[10px] font-medium text-muted-foreground">দৈনিক গড় {formatMoney(dailyAverage)}</p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">মোট বাজেট {formatMoney(salary)}</p>
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
                <span>বাজেট {formatMoney(salary)}</span>
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