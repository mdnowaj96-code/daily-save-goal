import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";

interface ReceiptImageProps {
  path: string;
  size?: number;
}

export function ReceiptImage({ path, size = 32 }: ReceiptImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from("receipts")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [path]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="shrink-0 rounded-md overflow-hidden border border-border/60 bg-muted/40 flex items-center justify-center"
        style={{ width: size, height: size }}
        aria-label="রশিদের ছবি দেখুন"
      >
        {url ? (
          <img src={url} alt="রশিদ" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-2">
          {url && (
            <img src={url} alt="খরচের রশিদ" className="w-full h-auto rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
