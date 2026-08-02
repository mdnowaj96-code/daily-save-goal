import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  EXPENSE_CATEGORIES as BUILTIN_CATEGORIES,
  DEFAULT_CATEGORY,
  setCategoryRegistry,
  type ExpenseCategory,
} from "@/lib/expenseCategories";

interface Row { id: string; label: string; emoji: string; hidden: boolean }

interface CategoriesContextType {
  categories: ExpenseCategory[];
  loading: boolean;
  addCategory: (label: string, emoji: string) => Promise<{ error: string | null }>;
  removeCategory: (label: string) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    const { data } = await supabase
      .from("user_categories")
      .select("id,label,emoji,hidden")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const categories = useMemo(() => {
    const hidden = new Set(rows.filter((r) => r.hidden).map((r) => r.label));
    const base = BUILTIN_CATEGORIES.filter((c) => !hidden.has(c.label));
    const custom = rows
      .filter((r) => !r.hidden && !BUILTIN_CATEGORIES.some((c) => c.label === r.label))
      .map<ExpenseCategory>((r) => ({ key: r.label, label: r.label, emoji: r.emoji }));
    return [...base, ...custom];
  }, [rows]);

  useEffect(() => { setCategoryRegistry(categories); }, [categories]);

  const addCategory = useCallback(async (label: string, emoji: string) => {
    const name = label.trim();
    if (!user) return { error: "লগইন প্রয়োজন" };
    if (!name) return { error: "খাতের নাম দিন" };
    if (categories.some((c) => c.label === name)) return { error: "এই খাতটি আগে থেকেই আছে" };
    // Un-hide if it was a hidden builtin
    const hiddenRow = rows.find((r) => r.label === name && r.hidden);
    if (hiddenRow) {
      const { error } = await supabase.from("user_categories").delete().eq("id", hiddenRow.id);
      if (error) return { error: "যোগ করা যায়নি" };
      await refresh();
      return { error: null };
    }
    const { error } = await supabase.from("user_categories").insert({
      user_id: user.id, label: name, emoji: emoji || "💱", hidden: false,
    });
    if (error) return { error: "যোগ করা যায়নি" };
    await refresh();
    return { error: null };
  }, [user, categories, rows, refresh]);

  const removeCategory = useCallback(async (label: string) => {
    if (!user) return { error: "লগইন প্রয়োজন" };
    if (label === DEFAULT_CATEGORY) return { error: "ডিফল্ট খাত মুছা যাবে না" };
    const existing = rows.find((r) => r.label === label && !r.hidden);
    if (existing) {
      const { error } = await supabase.from("user_categories").delete().eq("id", existing.id);
      if (error) return { error: "মুছা যায়নি" };
    } else {
      const { error } = await supabase.from("user_categories").insert({
        user_id: user.id, label, emoji: "💱", hidden: true,
      });
      if (error) return { error: "মুছা যায়নি" };
    }
    await refresh();
    return { error: null };
  }, [user, rows, refresh]);

  return (
    <CategoriesContext.Provider value={{ categories, loading, addCategory, removeCategory, refresh }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used within CategoriesProvider");
  return ctx;
}
