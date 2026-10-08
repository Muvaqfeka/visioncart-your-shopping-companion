import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('wallet') }),
  z.object({ action: z.literal('approve'), order_id: z.string().uuid(), password: z.string().min(1).max(256) }),
  z.object({ action: z.literal('pay'), order_id: z.string().uuid(), approval_id: z.string().uuid() }),
  z.object({ action: z.literal('recharge'), amount: z.number().positive().max(100000).multipleOf(0.01) }),
  z.object({ action: z.literal('verify_recharge'), recharge_id: z.string().uuid() }),
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) return json({ error: 'Payment service unavailable' }, 503);
    const client = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user || user.is_anonymous) return json({ error: 'Sign in to securely use your Vision Card.' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid payment request' }, 400);
    const body = parsed.data;
    const admin = createClient(url, service);
    // Ignore browser-stored balances; the server owns all monetary state.
    const { error: initError } = await admin.from('vision_wallets').upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (initError) throw initError;
    if (body.action === 'wallet') {
      const { data, error } = await admin.from('vision_wallets').select('balance').eq('user_id', user.id).single();
      if (error) throw error;
      return json(data);
    }
    if (body.action === 'approve') {
      if (!user.email) return json({ error: 'An email and password account is required for secure approval.' }, 400);
      // A separate client avoids replacing the shopper's active session.
      const verifier = createClient(url, anon, { auth: { persistSession: false } });
      const { error } = await verifier.auth.signInWithPassword({ email: user.email, password: body.password });
      if (error) return json({ error: 'Password was not verified. Payment remains blocked.' }, 403);
      await verifier.auth.signOut();
      const { data: order } = await admin.from('orders').select('id').eq('id', body.order_id).eq('user_id', user.id).single();
      if (!order) return json({ error: 'This order must belong to your signed-in account.' }, 403);
      const { data: approval, error: approvalError } = await admin.from('payment_approvals').insert({ user_id: user.id, order_id: body.order_id }).select('id').single();
      if (approvalError) throw approvalError;
      return json({ approval_id: approval.id });
    }
    if (body.action === 'pay') {
      const { data, error } = await admin.rpc('debit_vision_wallet', { owner_id: user.id, target_order: body.order_id, approval_id: body.approval_id });
      if (error) return json({ error: error.message }, 400);
      return json({ balance: data, paid: true });
    }
    const key = Deno.env.get('RAZORPAY_KEY_ID');
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!key || !secret) return json({ error: 'UPI recharges are not enabled yet. The store must connect a merchant payment account first.' }, 503);
    const provider = async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`https://api.razorpay.com/v1/${path}`, { ...options, headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}`, 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error('Payment provider could not complete the request. Please retry.');
      return data;
    };
    if (body.action === 'recharge') {
      const order = await provider('orders', { method: 'POST', body: JSON.stringify({ amount: Math.round(body.amount * 100), currency: 'INR', receipt: crypto.randomUUID() }) });
      const { data, error } = await admin.from('wallet_recharges').insert({ user_id: user.id, amount: body.amount, provider_order_id: order.id }).select('id').single();
      if (error) throw error;
      return json({ recharge_id: data.id, provider_order_id: order.id, key_id: key, amount: order.amount });
    }
    const { data: recharge } = await admin.from('wallet_recharges').select('*').eq('id', body.recharge_id).eq('user_id', user.id).single();
    if (!recharge) return json({ error: 'Recharge not found' }, 404);
    const payments = await provider(`orders/${encodeURIComponent(recharge.provider_order_id)}/payments`);
    const captured = payments.items?.some((p: { status: string; amount: number; currency: string; method: string }) => p.status === 'captured' && p.amount === Math.round(Number(recharge.amount) * 100) && p.currency === 'INR' && p.method === 'upi');
    if (!captured) return json({ paid: false, error: 'UPI payment has not been verified yet. Balance is unchanged.' });
    const { data: balance, error } = await admin.rpc('credit_verified_recharge', { recharge_id: recharge.id });
    if (error) throw error;
    return json({ paid: true, balance });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Payment could not be completed' }, 400); }
});