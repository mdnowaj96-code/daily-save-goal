ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_description_length CHECK (char_length(description) >= 1 AND char_length(description) <= 500);

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_month_format CHECK (month ~ '^\d{4}-\d{2}$');