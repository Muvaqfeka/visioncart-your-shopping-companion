import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "svc.wallet";
const INITIAL_BALANCE = 1000;

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
  recharge: (amount: number) => void;
  pay: (amount: number, note?: string) => boolean;
  reset: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function load(): WalletState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.balance === "number") {
        return { balance: parsed.balance, txns: Array.isArray(parsed.txns) ? parsed.txns : [] };
      }
    }
  } catch {}
  return { balance: INITIAL_BALANCE, txns: [] };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(() => load());

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const recharge = useCallback((amount: number) => {
    if (!amount || amount <= 0) return;
    setState((s) => ({
      balance: s.balance + amount,
      txns: [{ id: crypto.randomUUID(), type: "recharge" as const, amount, note: "Card recharge", at: Date.now() }, ...s.txns].slice(0, 30),
    }));
  }, []);

  const pay = useCallback((amount: number, note = "Order payment") => {
    let ok = false;
    setState((s) => {
      if (s.balance < amount) return s;
      ok = true;
      return {
        balance: s.balance - amount,
        txns: [{ id: crypto.randomUUID(), type: "payment", amount, note, at: Date.now() }, ...s.txns].slice(0, 30),
      };
    });
    // read synchronously from the latest snapshot to return a reliable result
    return ok || state.balance >= amount;
  }, [state.balance]);

  const reset = useCallback(() => setState({ balance: INITIAL_BALANCE, txns: [] }), []);

  return (
    <WalletContext.Provider
      value={{ ...state, cardNumber: "5241 88•• •••• 1000", recharge, pay, reset }}
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
