import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";

interface CircleBoxProps {
  label: string;
  amount: number;
  percent?: number;
  colorVar: string;
  onEdit?: (value: number) => void;
  subtitle?: string;
}

export function CircleBox({ label, amount, percent, colorVar, onEdit, subtitle }: CircleBoxProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(amount));

  const handleSave = () => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0 && onEdit) {
      onEdit(val);
    }
    setEditing(false);
  };

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (circumference * (percent ?? 100)) / 100;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28 sm:w-32 sm:h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={`hsl(var(--${colorVar}))`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {editing ? (
            <div className="flex flex-col items-center gap-1">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-16 h-7 text-xs text-center p-1"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm sm:text-base font-bold text-foreground">
                ৳{amount.toLocaleString("bn-BD")}
              </span>
              {percent !== undefined && (
                <span className="text-[10px] text-muted-foreground">{percent}%</span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {onEdit && !editing && (
          <button
            onClick={() => {
              setEditValue(String(amount));
              setEditing(true);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
    </div>
  );
}
