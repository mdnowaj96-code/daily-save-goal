CREATE TABLE public.category_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_targets TO authenticated;
GRANT ALL ON public.category_targets TO service_role;

ALTER TABLE public.category_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own category targets"
ON public.category_targets FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_category_targets_updated_at
BEFORE UPDATE ON public.category_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();