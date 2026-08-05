CREATE TABLE public.savings_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  method text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_deposits TO authenticated;
GRANT ALL ON public.savings_deposits TO service_role;
ALTER TABLE public.savings_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own savings deposits" ON public.savings_deposits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_savings_deposits_updated_at BEFORE UPDATE ON public.savings_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.savings_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_loans TO authenticated;
GRANT ALL ON public.savings_loans TO service_role;
ALTER TABLE public.savings_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own savings loans" ON public.savings_loans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_savings_loans_updated_at BEFORE UPDATE ON public.savings_loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();