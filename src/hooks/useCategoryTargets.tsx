import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCategoryTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setTargets({}); setLoading(false); return; }
    const { data } = await supabase
      .from("category_targets")
      .select("category,amount")
      .eq("user_id", user.id);
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { map[r.category] = Number(r.amount); });
    setTargets(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const setTarget = useCallback(async (category: string, amount: number) => {
    if (!user) return { error: "লগইন প্রয়োজন" };
    if (amount <= 0) {
      const { error } = await supabase
        .from("category_targets").delete()
        .eq("user_id", user.id).eq("category", category);
      if (error) return { error: "সংরক্ষণ করা যায়নি" };
      setTargets((p) => { const n = { ...p }; delete n[category]; return n; });
      return { error: null };
    }
    const { error } = await supabase
      .from("category_targets")
      .upsert({ user_id: user.id, category, amount }, { onConflict: "user_id,category" });
    if (error) return { error: "সংরক্ষণ করা যায়নি" };
    setTargets((p) => ({ ...p, [category]: amount }));
    return { error: null };
  }, [user]);

  return { targets, loading, setTarget, refresh };
}
