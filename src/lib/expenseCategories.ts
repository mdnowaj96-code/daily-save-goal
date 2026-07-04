export interface ExpenseCategory {
  key: string;
  label: string;
  emoji: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: "বাজার", label: "বাজার", emoji: "🍚" },
  { key: "যাতায়াত", label: "যাতায়াত", emoji: "🚗" },
  { key: "বিল", label: "বিল", emoji: "💡" },
  { key: "চিকিৎসা", label: "চিকিৎসা", emoji: "🏥" },
  { key: "খাবার", label: "খাবার", emoji: "🍔" },
  { key: "পোশাক", label: "পোশাক", emoji: "👕" },
  { key: "উপহার", label: "উপহার", emoji: "🎁" },
  { key: "মোবাইল/ইন্টারনেট", label: "মোবাইল/ইন্টারনেট", emoji: "📱" },
  { key: "শিক্ষা", label: "শিক্ষা", emoji: "📚" },
  { key: "অন্যান্য", label: "অন্যান্য", emoji: "💱" },
];

export const DEFAULT_CATEGORY = "অন্যান্য";

export const getCategoryMeta = (key: string): ExpenseCategory => {
  return (
    EXPENSE_CATEGORIES.find((c) => c.key === key) ?? {
      key,
      label: key,
      emoji: "💱",
    }
  );
};