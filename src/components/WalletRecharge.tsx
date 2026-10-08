import { useState } from 'react';
import { PlusCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { paymentRequest, loadPaymentCheckout } from '@/lib/visionPayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { speak } from '@/hooks/useSpeech';

export default function WalletRecharge() {
  const wallet = useWallet();
  const { language } = useLanguage();
  const [amount, setAmount] = useState('500');
  const [busy, setBusy] = useState(false);
  const [rechargeId, setRechargeId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const verify = async (id: string) => {
    setBusy(true);
    try {
      const result = await paymentRequest({ action: 'verify_recharge', recharge_id: id });
      if (!result.paid) { setMessage(result.error); return; }
      const balance = await wallet.refresh();
      setRechargeId(null); setSuccess(true);
      const text = language === 'ta' ? `ரீசார்ஜ் வெற்றி. புதிய இருப்பு ${balance.toLocaleString('en-IN')} ரூபாய்.` : `Recharge successful. Your new balance is ₹${balance.toLocaleString('en-IN')}.`;
      setMessage(text); speak(text);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Payment could not be verified'); }
    finally { setBusy(false); }
  };
  const start = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 100000) { setMessage('Enter an amount between ₹1 and ₹1,00,000'); return; }
    setBusy(true); setMessage(''); setSuccess(false);
    try {
      const order = await paymentRequest({ action: 'recharge', amount: value });
      setRechargeId(order.recharge_id);
      await loadPaymentCheckout();
      const Checkout = window.Razorpay;
      if (!Checkout) throw new Error('UPI checkout unavailable');
      new Checkout({ key: order.key_id, order_id: order.provider_order_id, amount: order.amount, currency: 'INR', name: 'Smart Vision Cart', description: 'Vision Card UPI recharge', config: { display: { blocks: { upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] } }, sequence: ['block.upi'], preferences: { show_default_blocks: false } } }, handler: () => verify(order.recharge_id), modal: { ondismiss: () => { setMessage('Payment not completed. Your balance is unchanged.'); setBusy(false); } } }).open();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not start recharge'); setBusy(false); }
  };
  return <div className="space-y-3 border-t border-border pt-3">
    <label className="text-sm font-medium" htmlFor="recharge-amount">{language === 'ta' ? 'UPI மூலம் ரீசார்ஜ்' : 'Recharge via UPI'}</label>
    <div className="flex gap-2"><Input id="recharge-amount" type="number" min="1" max="100000" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy || Boolean(rechargeId)} /><Button onClick={start} disabled={busy || Boolean(rechargeId)}>{busy ? <Loader2 className="animate-spin" /> : <PlusCircle />}{language === 'ta' ? 'ரீசார்ஜ்' : 'Recharge'}</Button></div>
    {rechargeId && <div className="flex gap-2"><Button variant="secondary" disabled={busy} onClick={() => verify(rechargeId)}>Check payment status</Button><Button variant="ghost" disabled={busy} onClick={() => { setRechargeId(null); setMessage('Balance unchanged. You can start a new payment.'); }}>Cancel</Button></div>}
    {message && <p role="status" className={`text-sm ${success ? 'text-primary' : 'text-muted-foreground'}`}>{success && <CheckCircle2 className="inline w-4 h-4 mr-1" />}{message}</p>}
  </div>;
}