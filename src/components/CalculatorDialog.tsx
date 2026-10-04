import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const toBn = (s: string) => s.replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

function evaluate(expr: string): number | null {
  // Only digits, operators, dots, spaces allowed
  if (!/^[0-9+\-*/.()%\s]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)() as number;
    if (typeof result !== "number" || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

const formatResult = (n: number) => {
  const rounded = Math.round(n * 1e10) / 1e10;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
};

export function CalculatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const press = (key: string) => {
    setError(false);
    if (key === "C") {
      setExpr("");
      setResult(null);
      return;
    }
    if (key === "⌫") {
      setExpr((e) => e.slice(0, -1));
      return;
    }
    if (key === "=") {
      const val = evaluate(expr);
      if (val === null) {
        setError(true);
        setResult(null);
      } else {
        setResult(formatResult(val));
        setExpr(String(Math.round(val * 1e10) / 1e10));
      }
      return;
    }
    // After a result, starting with an operator continues from it; a digit starts fresh
    if (result !== null) {
      setResult(null);
      if (/[0-9.]/.test(key)) setExpr(key);
      else setExpr((e) => e + key);
      return;
    }
    setExpr((e) => e + key);
  };

  const keys = [
    ["C", "⌫", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "−"],
    ["1", "2", "3", "+"],
    ["0", ".", "(", ")"],
  ];
  const keyMap: Record<string, string> = { "÷": "/", "×": "*", "−": "-", "%": "/100" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-left text-xl font-bold text-foreground">ক্যালকুলেটর</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-muted/60 p-4 text-right">
          <p className={cn("min-h-[28px] break-all text-2xl font-bold tabular-nums", error ? "text-budget-over" : "text-foreground")}>
            {error ? "ভুল হিসাব" : expr ? toBn(expr) : toBn("0")}
          </p>
          {result !== null && (
            <p className="mt-1 break-all text-lg font-semibold text-primary tabular-nums">= {toBn(result)}</p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {keys.flat().map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(keyMap[k] ?? k)}
              className={cn(
                "flex h-12 items-center justify-center rounded-xl text-lg font-bold transition-colors",
                k === "C" || k === "⌫"
                  ? "bg-budget-over/10 text-budget-over hover:bg-budget-over/20"
                  : /[÷×−+%()]/.test(k)
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted text-foreground hover:bg-muted/70"
              )}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => press("=")}
            className="col-span-4 flex h-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            =
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
