CREATE TABLE public.product_inventory (product_id text PRIMARY KEY, stock integer NOT NULL DEFAULT 0 CHECK(stock >= 0), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.product_inventory TO anon, authenticated;
GRANT ALL ON public.product_inventory TO service_role;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public stock reads" ON public.product_inventory FOR SELECT TO anon, authenticated USING(true);
CREATE TABLE public.vision_wallets (user_id uuid PRIMARY KEY, balance numeric(12,2) NOT NULL DEFAULT 1000 CHECK(balance >= 0));
GRANT SELECT ON public.vision_wallets TO authenticated;
GRANT ALL ON public.vision_wallets TO service_role;
ALTER TABLE public.vision_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wallet read" ON public.vision_wallets FOR SELECT TO authenticated USING(user_id = auth.uid());
CREATE TABLE public.wallet_recharges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount > 0 AND amount <= 100000), provider_order_id text UNIQUE NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.wallet_recharges TO authenticated;
GRANT ALL ON public.wallet_recharges TO service_role;
ALTER TABLE public.wallet_recharges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own recharge read" ON public.wallet_recharges FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.credit_verified_recharge(recharge_id uuid) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.wallet_recharges; b numeric;
BEGIN
 SELECT * INTO r FROM public.wallet_recharges WHERE id=recharge_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Recharge not found'; END IF;
 IF r.status <> 'paid' THEN
 UPDATE public.vision_wallets SET balance=balance+r.amount WHERE user_id=r.user_id RETURNING balance INTO b;
 IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
 UPDATE public.wallet_recharges SET status='paid' WHERE id=r.id;
 ELSE SELECT balance INTO b FROM public.vision_wallets WHERE user_id=r.user_id;
 END IF;
 RETURN b;
END; $$;
REVOKE ALL ON FUNCTION public.credit_verified_recharge(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_verified_recharge(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.debit_vision_wallet(owner_id uuid, target_order uuid) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; b numeric;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=target_order AND user_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.payment_status='paid' THEN SELECT balance INTO b FROM public.vision_wallets WHERE user_id=owner_id; RETURN b; END IF;
 UPDATE public.vision_wallets SET balance=balance-o.total WHERE user_id=owner_id AND balance>=o.total RETURNING balance INTO b;
 IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
 UPDATE public.orders SET payment_method='card',payment_status='paid',verified_at=now() WHERE id=target_order;
 RETURN b;
END; $$;
REVOKE ALL ON FUNCTION public.debit_vision_wallet(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_vision_wallet(uuid,uuid) TO service_role;