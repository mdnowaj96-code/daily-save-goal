import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { DEFAULT_CATEGORY } from "@/lib/expenseCategories";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const EMOJI_CHOICES = ["🍚","🚗","💡","🏥","🍔","👕","🎁","📱","📚","💲","💱","🏠","🛒","✈️","🎓","🐄","💊","🧾","🎬","☕","💇","🔧","🐟","🌾","👶","🕌","💰","🎉"];

export function ManageCategoriesDialog() {
  const { categories, addCategory, removeCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("💱");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    const { error } = await addCategory(label, emoji);
    setSaving(false);
    if (error) { toast.error(error); return; }
    setLabel(""); setEmoji("💱");
    toast.success("নতুন খাত যোগ হয়েছে");
  };

  const handleDelete = async (name: string) => {
    const { error } = await removeCategory(name);
    if (error) { toast.error(error); return; }
    toast.success("খাত মুছে ফেলা হয়েছে");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-10 shrink-0">
          <Settings2 className="h-4 w-4" />
          খাত
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>খাত ব্যবস্থাপনা</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 p-3 flex flex-col gap-2">
          <span className="text-xs font-semibold">নতুন খাত যোগ করুন</span>
          <div className="flex gap-2">
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 text-center text-lg h-9" maxLength={4} />
            <Input placeholder="খাতের নাম" value={label} onChange={(e) => setLabel(e.target.value)} className="text-sm h-9" />
          </div>
          <div className="flex flex-wrap gap-1">
            {EMOJI_CHOICES.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setEmoji(em)}
                className={`h-8 w-8 rounded-lg text-lg leading-none flex items-center justify-center border transition-colors ${emoji === em ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted"}`}
              >
                {em}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> যোগ করুন
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">সব খাত ({categories.length})</span>
          {categories.map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2">
              <span className="text-sm"><span className="mr-2">{c.emoji}</span>{c.label}</span>
              {c.label === DEFAULT_CATEGORY ? (
                <span className="text-[10px] text-muted-foreground">ডিফল্ট</span>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>খাত মুছবেন?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{c.label}" খাতটি তালিকা থেকে সরে যাবে। আগের খরচগুলো মুছবে না।
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>বাতিল</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(c.label)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        মুছুন
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
