import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { Product } from "@/data/products";
import { refreshStock } from '@/hooks/useInventory';
import { toast } from 'sonner';
import { speak } from '@/hooks/useSpeech';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => Promise<boolean>;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const busy = useRef(false);

  const addItem = useCallback(async (product: Product) => {
    if (busy.current) return false;
    busy.current = true;
    try {
      const stock = await refreshStock(product.id);
      const prev = itemsRef.current;
      const existing = prev.find(i => i.product.id === product.id);
      if (!product.available || stock <= (existing?.quantity ?? 0)) {
        const message = stock === 0 ? `${product.name} is out of stock.` : `Only ${stock} units of ${product.name} are available.`;
        toast.error(message);
        speak(message);
        return false;
      }
      const latest = { ...product, stock };
      const next = existing ? prev.map(i => i.product.id === product.id ? { product: latest, quantity: i.quantity + 1 } : i) : [...prev, { product: latest, quantity: 1 }];
      itemsRef.current = next;
      setItems(next);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check stock';
      toast.error(message);
      speak(message);
      return false;
    } finally { busy.current = false; }
  }, []);

  const removeItem = useCallback((productId: string) => {
    itemsRef.current = itemsRef.current.filter(i => i.product.id !== productId);
    setItems(itemsRef.current);
  }, []);

  const clearCart = useCallback(() => { itemsRef.current = []; setItems([]); }, []);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
