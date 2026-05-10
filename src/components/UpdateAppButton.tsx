import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function UpdateAppButton() {
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    setUpdating(true);
    toast.info("আপডেট চেক করা হচ্ছে...");
    try {
      // Clear all caches so new assets are fetched
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // Trigger service worker update
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (reg) => {
            try {
              await reg.update();
              if (reg.waiting) {
                reg.waiting.postMessage({ type: "SKIP_WAITING" });
              }
            } catch {
              // ignore
            }
          })
        );
      }

      toast.success("নতুন ভার্সন লোড হচ্ছে...");
      // Small delay so toast is visible, then hard reload
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (e) {
      setUpdating(false);
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleUpdate}
      disabled={updating}
      className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
    >
      <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
      {updating ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
    </Button>
  );
}
