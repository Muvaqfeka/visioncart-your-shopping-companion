import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from '@/integrations/supabase/client';
import { paymentRequest } from '@/lib/visionPayments';

const INITIAL_BALANCE = 0;

export interface WalletTxn {
  id: string;
  type: "recharge" | "payment";
  amount: number;
  note: string;
  at: number;
}

interface WalletState {
  balance: number;
  txns: WalletTxn[];
}

interface WalletContextType extends WalletState {
  cardNumber: string;
  refresh: () => Promise<number>;
  pay: (orderId: string, approvalId: string) => Promise<number>;
  reset: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ balance: INITIAL_BALANCE, txns: [] });
  const refresh = useCallback(async () => {
    const data = await paymentRequest({ action: 'wallet' });
    const balance = Number(data.balance);
    setState({ balance, txns: [] });
    return balance;
  }, []);
  useEffect(() => {
    let active = true;
    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session || data.session.user.is_anonymous) { setState({ balance: 0, txns: [] }); return; }
      refresh().catch(() => { if (active) setState({ balance: 0, txns: [] }); });
    };
    sync();
    const { data } = supabase.auth.onAuthStateChange(() => { setTimeout(sync, 0); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [refresh]);
  const pay = useCallback(async (orderId: string, approvalId: string) => {
    const data = await paymentRequest({ action: 'pay', order_id: orderId, approval_id: approvalId });
    const balance = Number(data.balance);
    setState({ balance, txns: [] });
    return balance;
  }, []);

  const reset = useCallback(() => setState({ balance: INITIAL_BALANCE, txns: [] }), []);

  return (
    <WalletContext.Provider
      value={{ ...state, cardNumber: "VISION •••• 1000", refresh, pay, reset }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
