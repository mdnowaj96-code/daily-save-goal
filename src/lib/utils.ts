import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTimeDiffInBn(fromDateStr: string, toDate: Date = new Date()): string {
  const from = new Date(fromDateStr);
  const fromNorm = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toNorm = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

  const [start, end] = fromNorm > toNorm ? [toNorm, fromNorm] : [fromNorm, toNorm];

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years.toLocaleString("bn-BD")} বছর`);
  if (months > 0) parts.push(`${months.toLocaleString("bn-BD")} মাস`);
  if (days > 0) parts.push(`${days.toLocaleString("bn-BD")} দিন`);

  if (parts.length === 0) return "আজ";
  return `${parts.join(" ")} আগে`;
}
