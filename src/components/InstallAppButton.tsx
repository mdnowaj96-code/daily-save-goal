import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    // Detect if already installed (running as standalone)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("অ্যাপ সফলভাবে ইনস্টল হয়েছে!");
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("অ্যাপ ইনস্টল হচ্ছে...");
      }
      setDeferredPrompt(null);
    } else {
      // No native prompt available (iOS or already shown) - show instructions
      setHelpOpen(true);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleInstall}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Download className="h-4 w-4" />
        অ্যাপ ইনস্টল করুন
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              অ্যাপ ইনস্টল করার নিয়ম
            </DialogTitle>
            <DialogDescription>
              আপনার ফোনের হোম স্ক্রিনে এই অ্যাপটি যোগ করুন
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-sm">
            <div className="rounded-lg border bg-card p-3">
              <p className="font-bold text-foreground mb-2">📱 iPhone (Safari):</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>নিচে শেয়ার বাটন (⬆️) চাপুন</li>
                <li>"Add to Home Screen" সিলেক্ট করুন</li>
                <li>"Add" বাটনে চাপুন</li>
              </ol>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <p className="font-bold text-foreground mb-2">🤖 Android (Chrome):</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>উপরে ডানদিকে মেনু (⋮) চাপুন</li>
                <li>"Install app" বা "Add to Home screen" সিলেক্ট করুন</li>
                <li>"Install" বাটনে চাপুন</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              ইনস্টল করার পর অ্যাপটি একটি সাধারণ অ্যাপের মতোই কাজ করবে এবং অফলাইনেও খুলবে।
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}