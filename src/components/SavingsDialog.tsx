import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["রকেট", "বিকাশ", "নগদ", "অগ্রণী", "ডাচ বাংলা"];

type Deposit = { id: string; method: string; amount: number; date: string };
type Loan = { id: string; person: string; amount: number; date: string };

const bn = (n: number) => n.toLocaleString("bn-BD", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

export function SavingsDialog({ open, onOpenChange, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; userId: string;
}) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [method, setMethod] = useState(METHODS[1]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [person, setPerson] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanDate, setLoanDate] = useState(today());

  const load = useCallback(async () => {
    const [d, l] = await Promise.all([
      supabase.from("savings_deposits").select("id,method,amount,date").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("savings_loans").select("id,person,amount,date").eq("user_id", userId).order("date", { ascending: false }),
    ]);
    setDeposits((d.data ?? []).map((r: any) => ({ ...r, amount: Number(r.amount) })));
    setLoans((l.data ?? []).map((r: any) => ({ ...r, amount: Number(r.amount) })));
  }, [userId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const byMethod = useMemo(() => {
    const map: Record<string, number> = {};
    deposits.forEach((d) => { map[d.method] = (map[d.method] ?? 0) + d.amount; });
    return map;
  }, [deposits]);

  const totalSavings = useMemo(() => deposits.reduce((s, d) => s + d.amount, 0), [deposits]);
  const totalLoans = useMemo(() => loans.reduce((s, l) => s + l.amount, 0), [loans]);
  const available = totalSavings - totalLoans;

  const addDeposit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("সঠিক পরিমাণ দিন"); return; }
    const { error } = await supabase.from("savings_deposits").insert({ user_id: userId, method, amount: amt, date });
    if (error) { toast.error("সংরক্ষণ করা যায়নি"); return; }
    setAmount(""); await load(); toast.success("সঞ্চয় যোগ হয়েছে");
  };

  const addLoan = async () => {
    const amt = parseFloat(loanAmount);
    if (!person.trim()) { toast.error("কাকে দেওয়া হয়েছে লিখুন"); return; }
    if (isNaN(amt) || amt <= 0) { toast.error("সঠিক পরিমাণ দিন"); return; }
    const { error } = await supabase.from("savings_loans").insert({ user_id: userId, person: person.trim(), amount: amt, date: loanDate });
    if (error) { toast.error("সংরক্ষণ করা যায়নি"); return; }
    setPerson(""); setLoanAmount(""); await load(); toast.success("লোন যোগ হয়েছে");
  };

  const del = async (table: "savings_deposits" | "savings_loans", id: string) => {
    await supabase.from(table).delete().eq("id", id);
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(26rem,94vw)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>💰</span> সঞ্চয়
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Add deposit */}
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <span className="text-xs font-semibold text-muted-foreground">নতুন সঞ্চয় যোগ করুন</span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 text-xs" />
            </div>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="টাকার পরিমাণ (৳)" />
            <Button onClick={addDeposit}>যোগ করুন</Button>
          </div>

          {/* Method totals */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground">মাধ্যম অনুযায়ী সঞ্চয়</span>
            <div className="flex flex-col gap-1.5">
              {METHODS.filter((m) => byMethod[m]).concat(Object.keys(byMethod).filter((m) => !METHODS.includes(m))).map((m) => (
                <div key={m} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <span>{m}</span>
                  <span className="font-bold">৳{bn(byMethod[m] ?? 0)}</span>
                </div>
              ))}
              {totalSavings === 0 && <p className="text-xs text-muted-foreground">এখনো কোনো সঞ্চয় যোগ হয়নি।</p>}
            </div>
          </div>

          {/* Deposit list */}
          {deposits.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
              {deposits.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs border-b pb-1">
                  <span className="text-muted-foreground">{new Date(d.date).toLocaleDateString("bn-BD")} • {d.method}</span>
                  <span className="flex items-center gap-2 font-medium">৳{bn(d.amount)}
                    <button onClick={() => del("savings_deposits", d.id)} aria-label="মুছুন" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Loans */}
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <span className="text-xs font-semibold text-muted-foreground">লোন দেওয়া হয়েছে</span>
            <Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="কাকে দেওয়া হয়েছে" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" inputMode="decimal" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="পরিমাণ (৳)" />
              <Input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className="h-10 text-xs" />
            </div>
            <Button variant="secondary" onClick={addLoan}>লোন যোগ করুন</Button>
            {loans.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1 mt-1">
                {loans.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs border-b pb-1">
                    <span className="text-muted-foreground">{new Date(l.date).toLocaleDateString("bn-BD")} • {l.person}</span>
                    <span className="flex items-center gap-2 font-medium">৳{bn(l.amount)}
                      <button onClick={() => del("savings_loans", l.id)} aria-label="মুছুন" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-xl border p-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">মোট সঞ্চয়</span><span className="font-bold">৳{bn(totalSavings)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">মোট লোন</span><span className="font-bold text-destructive">− ৳{bn(totalLoans)}</span></div>
            <div className="flex justify-between border-t pt-1.5"><span className="font-semibold">বর্তমান ব্যালেন্স</span><span className="font-extrabold text-foreground">৳{bn(available)}</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
