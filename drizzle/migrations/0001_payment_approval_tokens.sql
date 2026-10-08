CREATE TABLE public.payment_approvals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, order_id uuid NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes', used_at timestamptz);
GRANT ALL ON public.payment_approvals TO service_role;
ALTER TABLE public.payment_approvals ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.debit_vision_wallet(owner_id uuid, target_order uuid, approval_id uuid) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; b numeric;
BEGIN
 UPDATE public.payment_approvals SET used_at=now() WHERE id=approval_id AND user_id=owner_id AND order_id=target_order AND used_at IS NULL AND expires_at>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment approval expired. Verify your password again.'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=target_order AND user_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.payment_status='paid' THEN SELECT balance INTO b FROM public.vision_wallets WHERE user_id=owner_id; RETURN b; END IF;
 UPDATE public.vision_wallets SET balance=balance-o.total WHERE user_id=owner_id AND balance>=o.total AND o.total>0 RETURNING balance INTO b;
 IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
 UPDATE public.orders SET payment_method='card',payment_status='paid',verified_at=now() WHERE id=target_order;
 RETURN b;
END; $$;
REVOKE ALL ON FUNCTION public.debit_vision_wallet(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_vision_wallet(uuid,uuid,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.debit_vision_wallet(uuid,uuid) FROM service_role;