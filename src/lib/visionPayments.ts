import { supabase } from '@/integrations/supabase/client';

export async function paymentRequest(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('vision-payments', { body });
  if (error) {
    const response = error.context;
    if (response instanceof Response) {
      const details = await response.json().catch(() => null);
      throw new Error(details?.error ?? 'Payment service is unavailable');
    }
    throw new Error(error.message);
  }
  if (data?.error && !('paid' in data)) throw new Error(data.error);
  return data;
}

type CheckoutOptions = Record<string, unknown>;
declare global {
  interface Window { Razorpay?: new (options: CheckoutOptions) => { open: () => void }; }
}
let checkoutScript: Promise<void> | undefined;
export function loadPaymentCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => { checkoutScript = undefined; script.remove(); reject(new Error('Could not open secure UPI checkout')); };
    document.head.appendChild(script);
  });
  return checkoutScript;
}