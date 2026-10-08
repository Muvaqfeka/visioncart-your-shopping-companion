import { useState } from 'react';
import { Fingerprint, ShieldCheck, Loader2, LockKeyhole } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { paymentRequest } from '@/lib/visionPayments';
import { speak } from '@/hooks/useSpeech';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props { title: string; amount: number; orderId: string; onSuccess: (approvalId: string) => void; onCancel: () => void; }

export default function BiometricPrompt({ title, amount, orderId, onSuccess, onCancel }: Props) {
  const { language } = useLanguage();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const approve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await paymentRequest({ action: 'approve', order_id: orderId, password });
      setPassword('');
      speak(language === 'ta' ? 'பாதுகாப்பு சரிபார்ப்பு வெற்றி.' : 'Secure payment approval verified.');
      onSuccess(result.approval_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Verification failed';
      setError(message); speak(message);
    } finally { setBusy(false); }
  };
  return <form onSubmit={approve} className="border border-border rounded-lg p-5 space-y-4" role="dialog" aria-label="Secure payment approval">
    <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="text-primary" />{language === 'ta' ? 'பாதுகாப்பான அனுமதி' : 'Secure payment approval'}</h3>
    <p>{title} · ₹{amount.toLocaleString('en-IN')}</p>
    <p className="text-sm text-muted-foreground flex gap-2"><Fingerprint className="shrink-0 w-5 h-5" />{language === 'ta' ? 'பதிவு செய்யப்பட்ட கைரேகை இல்லை. உங்கள் கணக்கு கடவுச்சொல் மூலம் உறுதிப்படுத்தவும்.' : 'No enrolled fingerprint is available. Confirm with your account password instead.'}</p>
    <Input type="password" autoComplete="current-password" aria-label="Account password" placeholder={language === 'ta' ? 'கணக்கு கடவுச்சொல்' : 'Account password'} value={password} onChange={e => setPassword(e.target.value)} required />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={busy || !password} className="flex-1">{busy ? <Loader2 className="animate-spin" /> : <LockKeyhole />}{language === 'ta' ? 'சரிபார்த்து தொடரவும்' : 'Verify & approve'}</Button><Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{language === 'ta' ? 'ரத்து' : 'Cancel'}</Button></div>
  </form>;
}