-- Add month tracking to salary_settings (current active month)
ALTER TABLE public.salary_settings 
ADD COLUMN IF NOT EXISTS current_month TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM');

-- Add month column to expenses to associate each expense with a specific month period
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM');

CREATE INDEX IF NOT EXISTS idx_expenses_user_month ON public.expenses(user_id, month);

-- Create monthly_history table to store closed months
CREATE TABLE IF NOT EXISTS public.monthly_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  needs_percent NUMERIC NOT NULL DEFAULT 40,
  savings_percent NUMERIC NOT NULL DEFAULT 12,
  wants_percent NUMERIC NOT NULL DEFAULT 48,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  needs_remaining NUMERIC NOT NULL DEFAULT 0,
  wants_remaining NUMERIC NOT NULL DEFAULT 0,
  savings_remaining NUMERIC NOT NULL DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.monthly_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly history"
ON public.monthly_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly history"
ON public.monthly_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly history"
ON public.monthly_history FOR DELETE
USING (auth.uid() = user_id);
